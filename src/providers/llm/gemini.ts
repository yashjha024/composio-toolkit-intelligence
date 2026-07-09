import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { LlmProvider } from '../types.js';

export interface VertexUsageRecord {
  provider_route: string;
  project_id: string;
  location: string;
  model: string;
  successful_call_count: number;
  cumulative_input_tokens: number;
  cumulative_output_tokens: number;
  cumulative_total_tokens: number;
  cumulative_cached_tokens: number;
  cumulative_thinking_tokens: number;
  last_updated_timestamp: string;
}

export class GeminiLlmProvider implements LlmProvider {
  private ai: GoogleGenAI;
  private modelName: string;
  public callCount: number = 0;
  private metricsFilePath: string;

  private createClient(): GoogleGenAI {
    return new GoogleGenAI({
      vertexai: true,
      project: 'gen-lang-client-0153019470',
      location: 'global',
    });
  }

  constructor(modelName: string = 'gemini-2.5-pro', metricsFilePath?: string) {
    this.ai = this.createClient();
    this.modelName = process.env.GEMINI_MODEL || modelName;
    this.metricsFilePath = metricsFilePath || path.resolve(process.cwd(), 'data/metrics/vertex-usage.json');
    console.log(`[LlmProvider] Startup diagnostics:\n  provider route: vertex-ai\n  project ID: gen-lang-client-0153019470\n  location: global\n  model: ${this.modelName}`);
  }

  private cleanJsonString(raw: string): string {
    return raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async executeWithRetry<T>(fn: (ai: GoogleGenAI, model: string) => Promise<T>, retries = 5): Promise<T> {
    let currentModel = this.modelName;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const ai = this.createClient();
        return await fn(ai, currentModel);
      } catch (err: any) {
        const isRateLimit = err.status === 429 || (err.message && err.message.includes('429'));
        const isQuotaZero = err.message && (err.message.includes('limit: 0') || err.message.includes('not found') || err.status === 404);
        const isServerBusy = err.status === 503 || err.status === 500 || (err.message && (err.message.includes('503') || err.message.includes('high demand') || err.message.includes('UNAVAILABLE')));

        if (isQuotaZero && attempt < retries) {
          if (currentModel === 'gemini-2.5-pro' || currentModel === 'gemini-2.5-flash') {
            console.warn(`[LlmProvider] Model ${currentModel} reported quota/not found. Falling back to gemini-2.5-flash-lite...`);
            currentModel = 'gemini-2.5-flash-lite';
          } else if (currentModel === 'gemini-2.5-flash-lite') {
            currentModel = 'gemini-2.0-flash-lite';
          } else {
            currentModel = 'gemini-flash-latest';
          }
          await this.sleep(3000);
          continue;
        }

        if (isServerBusy && attempt < retries) {
          const delayMs = attempt * 6000 + 3000;
          console.warn(`[LlmProvider] 503/High Demand encountered on ${currentModel}. Waiting ${(delayMs / 1000).toFixed(1)}s before retry ${attempt}/${retries}...`);
          await this.sleep(delayMs);
          continue;
        }

        if (isRateLimit && attempt < retries) {
          let delayMs = 35000;
          const match = err.message?.match(/retry in (\d+(\.\d+)?)s/i);
          if (match && match[1]) {
            delayMs = Math.ceil(parseFloat(match[1]) * 1000) + 3000;
          }
          console.warn(`[LlmProvider] 429 Rate limit encountered on ${currentModel}. Waiting ${(delayMs / 1000).toFixed(1)}s before retry ${attempt}/${retries}...`);
          if (attempt === 1) {
            currentModel = 'gemini-2.5-flash-lite';
          } else if (attempt === 2) {
            currentModel = 'gemini-2.0-flash-lite';
          } else if (attempt === 3) {
            currentModel = 'gemini-flash-latest';
          } else {
            currentModel = 'gemini-2.0-flash';
          }
          await this.sleep(delayMs);
          continue;
        }
        throw err;
      }
    }
    throw new Error('LLM execution failed after retries.');
  }

  public async generateText(
    prompt: string,
    systemInstruction?: string,
    config?: Record<string, any>
  ): Promise<string> {
    this.callCount++;
    return this.executeWithRetry(async (ai, model) => {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          ...(systemInstruction ? { systemInstruction } : {}),
          ...(config || {}),
        },
      });
      this.recordUsage(response.usageMetadata);
      return response.text || '';
    });
  }

  public async generateStructured<T>(
    prompt: string,
    schema: object,
    systemInstruction?: string
  ): Promise<T> {
    this.callCount++;
    const fullPrompt = `${prompt}\n\nYou MUST return only valid, well-formed JSON conforming exactly to the following JSON Schema structure without any introductory text or markdown formatting outside the JSON object:\n${JSON.stringify(schema, null, 2)}`;

    return this.executeWithRetry(async (ai, model) => {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: fullPrompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
          },
        });

        const rawText = response.text || '{}';
        const cleaned = this.cleanJsonString(rawText);
        const parsed = JSON.parse(cleaned) as T;
        this.recordUsage(response.usageMetadata);
        return parsed;
      } catch (err: any) {
        if (err.status || (err.message && (err.message.includes('429') || err.message.includes('503') || err.message.includes('UNAVAILABLE') || err.message.includes('limit: 0') || err.message.includes('not found')))) {
          throw err;
        }
        // Fallback retry without responseMimeType if JSON mode parsing failed on a valid response
        const fallbackResponse = await ai.models.generateContent({
          model,
          contents: fullPrompt,
          config: systemInstruction ? { systemInstruction } : undefined,
        });
        const rawText = fallbackResponse.text || '{}';
        const cleaned = this.cleanJsonString(rawText);
        const parsed = JSON.parse(cleaned) as T;
        this.recordUsage(fallbackResponse.usageMetadata);
        return parsed;
      }
    });
  }

  private loadUsageFile(): VertexUsageRecord {
    try {
      if (fs.existsSync(this.metricsFilePath)) {
        const raw = fs.readFileSync(this.metricsFilePath, 'utf8');
        const data = JSON.parse(raw);
        return {
          provider_route: data.provider_route || 'vertex-ai',
          project_id: data.project_id || 'gen-lang-client-0153019470',
          location: data.location || 'global',
          model: data.model || this.modelName,
          successful_call_count: Number(data.successful_call_count) || 0,
          cumulative_input_tokens: Number(data.cumulative_input_tokens) || 0,
          cumulative_output_tokens: Number(data.cumulative_output_tokens) || 0,
          cumulative_total_tokens: Number(data.cumulative_total_tokens) || 0,
          cumulative_cached_tokens: Number(data.cumulative_cached_tokens) || 0,
          cumulative_thinking_tokens: Number(data.cumulative_thinking_tokens) || 0,
          last_updated_timestamp: data.last_updated_timestamp || new Date().toISOString(),
        };
      }
    } catch (err) {
      console.warn(`[LlmProvider] Failed to load usage file at ${this.metricsFilePath}. Initializing at zero.`);
    }

    return {
      provider_route: 'vertex-ai',
      project_id: 'gen-lang-client-0153019470',
      location: 'global',
      model: this.modelName,
      successful_call_count: 0,
      cumulative_input_tokens: 0,
      cumulative_output_tokens: 0,
      cumulative_total_tokens: 0,
      cumulative_cached_tokens: 0,
      cumulative_thinking_tokens: 0,
      last_updated_timestamp: new Date().toISOString(),
    };
  }

  private saveUsageFile(record: VertexUsageRecord): void {
    try {
      const dir = path.dirname(this.metricsFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const tempFile = `${this.metricsFilePath}.tmp.${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      fs.writeFileSync(tempFile, JSON.stringify(record, null, 2), 'utf8');
      fs.renameSync(tempFile, this.metricsFilePath);
    } catch (err) {
      console.warn(`[LlmProvider] Failed to atomically save usage file at ${this.metricsFilePath}:`, err);
    }
  }

  public recordUsage(usageMetadata?: any): void {
    const promptTokens = Number(usageMetadata?.promptTokenCount) || 0;
    const candidatesTokens = Number(usageMetadata?.candidatesTokenCount) || 0;
    const totalTokens = Number(usageMetadata?.totalTokenCount) || 0;
    const cachedTokens = Number(usageMetadata?.cachedContentTokenCount) || 0;
    const thoughtsTokens = Number(usageMetadata?.thoughtsTokenCount) || 0;

    console.log(`[Vertex Usage] input=${promptTokens} output=${candidatesTokens} total=${totalTokens} cached=${cachedTokens} thoughts=${thoughtsTokens}`);

    const current = this.loadUsageFile();
    current.successful_call_count += 1;
    current.cumulative_input_tokens += promptTokens;
    current.cumulative_output_tokens += candidatesTokens;
    current.cumulative_total_tokens += totalTokens;
    current.cumulative_cached_tokens += cachedTokens;
    current.cumulative_thinking_tokens += thoughtsTokens;
    current.last_updated_timestamp = new Date().toISOString();
    current.model = this.modelName;

    this.saveUsageFile(current);
  }

  public calculateEstimatedCost(summary: {
    cumulative_input_tokens: number;
    cumulative_output_tokens: number;
    cumulative_cached_tokens: number;
    cumulative_thinking_tokens: number;
  }): string {
    const inputPriceStr = process.env.VERTEX_INPUT_PRICE_PER_MILLION;
    const outputPriceStr = process.env.VERTEX_OUTPUT_PRICE_PER_MILLION;

    if (!inputPriceStr || !outputPriceStr || isNaN(parseFloat(inputPriceStr)) || isNaN(parseFloat(outputPriceStr))) {
      return 'Estimated cost unavailable: pricing configuration not set.';
    }

    const inputRate = parseFloat(inputPriceStr);
    const outputRate = parseFloat(outputPriceStr);
    const cachedRateStr = process.env.VERTEX_CACHED_PRICE_PER_MILLION;
    const cachedRate = cachedRateStr && !isNaN(parseFloat(cachedRateStr)) ? parseFloat(cachedRateStr) : inputRate;
    const thinkingRateStr = process.env.VERTEX_THINKING_PRICE_PER_MILLION;
    const thinkingRate = thinkingRateStr && !isNaN(parseFloat(thinkingRateStr)) ? parseFloat(thinkingRateStr) : outputRate;

    const inputCost = (summary.cumulative_input_tokens / 1_000_000) * inputRate;
    const outputCost = (summary.cumulative_output_tokens / 1_000_000) * outputRate;
    const cachedCost = (summary.cumulative_cached_tokens / 1_000_000) * cachedRate;
    const thinkingCost = (summary.cumulative_thinking_tokens / 1_000_000) * thinkingRate;

    const totalCost = inputCost + outputCost + cachedCost + thinkingCost;
    return `Estimated API cost: $${totalCost.toFixed(6)}`;
  }

  public getCumulativeUsageSummary(): VertexUsageRecord & { estimated_cost: string } {
    const current = this.loadUsageFile();
    return {
      ...current,
      estimated_cost: this.calculateEstimatedCost(current),
    };
  }
}
