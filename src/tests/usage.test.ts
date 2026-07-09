import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { GeminiLlmProvider } from '../providers/llm/gemini.js';

describe('Vertex AI LLM Provider — Token Usage & Estimated Cost Observability', () => {
  const testMetricsPath = path.resolve(process.cwd(), 'data/metrics/test-vertex-usage.json');

  beforeEach(() => {
    if (fs.existsSync(testMetricsPath)) {
      fs.unlinkSync(testMetricsPath);
    }
    delete process.env.VERTEX_INPUT_PRICE_PER_MILLION;
    delete process.env.VERTEX_OUTPUT_PRICE_PER_MILLION;
    delete process.env.VERTEX_CACHED_PRICE_PER_MILLION;
    delete process.env.VERTEX_THINKING_PRICE_PER_MILLION;
  });

  afterEach(() => {
    if (fs.existsSync(testMetricsPath)) {
      fs.unlinkSync(testMetricsPath);
    }
  });

  it('1. missing optional token fields become zero and successful call count increments once per call', () => {
    const provider = new GeminiLlmProvider('gemini-2.5-flash', testMetricsPath);
    
    // Pass empty usageMetadata (or absent fields)
    provider.recordUsage({});

    const summary = provider.getCumulativeUsageSummary();
    expect(summary.successful_call_count).toBe(1);
    expect(summary.cumulative_input_tokens).toBe(0);
    expect(summary.cumulative_output_tokens).toBe(0);
    expect(summary.cumulative_total_tokens).toBe(0);
    expect(summary.cumulative_cached_tokens).toBe(0);
    expect(summary.cumulative_thinking_tokens).toBe(0);
  });

  it('2. cumulative totals add correctly across multiple calls', () => {
    const provider = new GeminiLlmProvider('gemini-2.5-flash', testMetricsPath);

    provider.recordUsage({
      promptTokenCount: 150,
      candidatesTokenCount: 50,
      totalTokenCount: 200,
    });

    provider.recordUsage({
      promptTokenCount: 300,
      candidatesTokenCount: 120,
      totalTokenCount: 420,
      cachedContentTokenCount: 40,
      thoughtsTokenCount: 25,
    });

    const summary = provider.getCumulativeUsageSummary();
    expect(summary.successful_call_count).toBe(2);
    expect(summary.cumulative_input_tokens).toBe(450);
    expect(summary.cumulative_output_tokens).toBe(170);
    expect(summary.cumulative_total_tokens).toBe(620);
    expect(summary.cumulative_cached_tokens).toBe(40);
    expect(summary.cumulative_thinking_tokens).toBe(25);
  });

  it('3. failed calls do not increment usage', async () => {
    const provider = new GeminiLlmProvider('gemini-2.5-flash', testMetricsPath);
    
    // Mock generateText to throw
    vi.spyOn(provider as any, 'executeWithRetry').mockRejectedValue(new Error('API Error'));

    await expect(provider.generateText('test prompt')).rejects.toThrow('API Error');

    const summary = provider.getCumulativeUsageSummary();
    expect(summary.successful_call_count).toBe(0);
    expect(summary.cumulative_total_tokens).toBe(0);
  });

  it('4. existing usage data is not reset if file already exists', () => {
    // Seed initial metrics
    const initialData = {
      provider_route: 'vertex-ai',
      project_id: 'gen-lang-client-0153019470',
      location: 'global',
      model: 'gemini-2.5-flash',
      successful_call_count: 5,
      cumulative_input_tokens: 1000,
      cumulative_output_tokens: 500,
      cumulative_total_tokens: 1500,
      cumulative_cached_tokens: 100,
      cumulative_thinking_tokens: 50,
      last_updated_timestamp: new Date().toISOString(),
    };
    const dir = path.dirname(testMetricsPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(testMetricsPath, JSON.stringify(initialData, null, 2), 'utf8');

    // Create new provider instance
    const provider = new GeminiLlmProvider('gemini-2.5-flash', testMetricsPath);
    provider.recordUsage({
      promptTokenCount: 100,
      candidatesTokenCount: 20,
      totalTokenCount: 120,
    });

    const summary = provider.getCumulativeUsageSummary();
    expect(summary.successful_call_count).toBe(6);
    expect(summary.cumulative_input_tokens).toBe(1100);
    expect(summary.cumulative_output_tokens).toBe(520);
    expect(summary.cumulative_total_tokens).toBe(1620);
    expect(summary.cumulative_cached_tokens).toBe(100);
    expect(summary.cumulative_thinking_tokens).toBe(50);
  });

  it('5. estimated cost reporting behaves accurately based on configuration', () => {
    const provider = new GeminiLlmProvider('gemini-2.5-flash', testMetricsPath);
    provider.recordUsage({
      promptTokenCount: 1_000_000,
      candidatesTokenCount: 1_000_000,
      totalTokenCount: 2_000_000,
    });

    // Without pricing env set
    expect(provider.getCumulativeUsageSummary().estimated_cost).toBe('Estimated cost unavailable: pricing configuration not set.');

    // With explicit pricing set ($0.075 per 1M input, $0.30 per 1M output)
    process.env.VERTEX_INPUT_PRICE_PER_MILLION = '0.075';
    process.env.VERTEX_OUTPUT_PRICE_PER_MILLION = '0.30';
    
    expect(provider.getCumulativeUsageSummary().estimated_cost).toBe('Estimated API cost: $0.375000');
  });

  it('6. no benchmark record is modified or touched during usage accumulation', () => {
    const recordsDir = path.resolve(process.cwd(), 'data/records');
    const existingRecords = fs.readdirSync(recordsDir).filter(f => f.endsWith('.json'));
    const initialTimestamps = new Map<string, number>();

    for (const f of existingRecords) {
      initialTimestamps.set(f, fs.statSync(path.join(recordsDir, f)).mtimeMs);
    }

    const provider = new GeminiLlmProvider('gemini-2.5-flash', testMetricsPath);
    provider.recordUsage({ promptTokenCount: 500, candidatesTokenCount: 200, totalTokenCount: 700 });

    for (const f of existingRecords) {
      expect(fs.statSync(path.join(recordsDir, f)).mtimeMs).toBe(initialTimestamps.get(f));
    }
  });
});
