import { GoogleGenAI } from '@google/genai';
import { LlmProvider } from '../types.js';

export class GeminiLlmProvider implements LlmProvider {
  private ai: GoogleGenAI;
  private modelName: string;
  public callCount: number = 0;

  constructor(modelName: string = 'gemini-2.5-pro') {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in .env or environment variables.');
    }
    this.ai = new GoogleGenAI({ apiKey });
    this.modelName = process.env.GEMINI_MODEL || modelName;
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

  private async executeWithRetry<R>(fn: (model: string) => Promise<R>, retries = 3): Promise<R> {
    let currentModel = this.modelName;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await fn(currentModel);
      } catch (err: any) {
        const isRateLimit = err.status === 429 || (err.message && err.message.includes('429'));
        const isQuotaZero = err.message && (err.message.includes('limit: 0') || err.message.includes('not found') || err.status === 404);

        // If quota limit for gemini-2.5-pro is 0 on free tier, switch to gemini-2.5-flash or gemini-2.0-flash automatically
        if (isQuotaZero && currentModel === 'gemini-2.5-pro' && attempt < retries) {
          console.warn(`[LlmProvider] Model ${currentModel} reported 0 quota/unavailable on this API key. Falling back to gemini-2.5-flash...`);
          currentModel = 'gemini-2.5-flash';
          await this.sleep(2000);
          continue;
        }

        if (isRateLimit && attempt < retries) {
          let delayMs = 30000; // Default 30s wait for free tier rate limit reset
          const match = err.message?.match(/retry in (\d+(\.\d+)?)s/i);
          if (match && match[1]) {
            delayMs = Math.ceil(parseFloat(match[1]) * 1000) + 2000;
          }
          console.warn(`[LlmProvider] 429 Rate limit encountered on ${currentModel}. Waiting ${(delayMs / 1000).toFixed(1)}s before retry ${attempt}/${retries} (or switching to 2.0-flash)...`);
          if (attempt === 2 && currentModel === 'gemini-2.5-flash') {
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

  public async generateText(prompt: string, systemInstruction?: string): Promise<string> {
    this.callCount++;
    return this.executeWithRetry(async (model) => {
      const response = await this.ai.models.generateContent({
        model,
        contents: prompt,
        config: systemInstruction ? { systemInstruction } : undefined,
      });
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

    return this.executeWithRetry(async (model) => {
      try {
        const response = await this.ai.models.generateContent({
          model,
          contents: fullPrompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
          },
        });

        const rawText = response.text || '{}';
        const cleaned = this.cleanJsonString(rawText);
        return JSON.parse(cleaned) as T;
      } catch (err: any) {
        if (err.status === 429 || (err.message && err.message.includes('429'))) {
          throw err;
        }
        // Fallback retry without responseMimeType if JSON mode parsing or schema constraint failed
        const fallbackResponse = await this.ai.models.generateContent({
          model,
          contents: fullPrompt,
          config: systemInstruction ? { systemInstruction } : undefined,
        });
        const rawText = fallbackResponse.text || '{}';
        const cleaned = this.cleanJsonString(rawText);
        return JSON.parse(cleaned) as T;
      }
    });
  }
}
