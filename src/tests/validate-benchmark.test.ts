import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs';
import { JsonStore } from '../lib/store.js';
import {
  BenchmarkAppSchema,
  CanonicalResearchRecordSchema,
} from '../types/schema.js';

describe('Immutable 100-App Benchmark Validation', () => {
  const store = new JsonStore(path.resolve(process.cwd(), 'data'));

  it('loads and validates data/benchmark_100.json against required identity fields using Zod', () => {
    const apps = store.loadBenchmark();
    expect(apps).toBeInstanceOf(Array);
    for (const app of apps) {
      expect(() => BenchmarkAppSchema.parse(app)).not.toThrow();
      expect(app.assignment_number).toBeGreaterThanOrEqual(1);
      expect(app.assignment_number).toBeLessThanOrEqual(100);
      expect(app.app_name).toBeTruthy();
      expect(typeof app.website_hint).toBe('string');
      expect(app.assigned_category).toBeTruthy();
    }
  });

  it('contains exactly 100 records', () => {
    const apps = store.loadBenchmark();
    expect(apps.length).toBe(100);
  });

  it('contains assignment numbers 1 through 100 exactly once with zero duplicates or missing IDs', () => {
    const apps = store.loadBenchmark();
    const ids = apps.map((a) => a.assignment_number).sort((a, b) => a - b);
    const expectedIds = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(ids).toEqual(expectedIds);
  });

  it('contains exactly 10 assignment categories', () => {
    const apps = store.loadBenchmark();
    const uniqueCategories = new Set(apps.map((a) => a.assigned_category));
    expect(uniqueCategories.size).toBe(10);
  });
});

describe('Identity-Only Calibration Fixtures Validation', () => {
  const store = new JsonStore(path.resolve(process.cwd(), 'data'));

  const expectedFixtures = [
    { id: 1, name: 'Salesforce', file: 'app_001_salesforce.json' },
    { id: 56, name: 'Firecrawl', file: 'app_056_firecrawl.json' },
    { id: 61, name: 'GitHub', file: 'app_061_github.json' },
    { id: 90, name: 'PitchBook', file: 'app_090_pitchbook.json' },
    { id: 92, name: 'Otter AI', file: 'app_092_otter_ai.json' },
  ];

  it('validates that all five calibration fixtures exist and conform to exact Zod runtime schema', () => {
    for (const item of expectedFixtures) {
      const record = store.getRecord(item.id, item.name);
      expect(record, `Fixture for ${item.name} (#${item.id}) should exist`).not.toBeNull();
      expect(() => CanonicalResearchRecordSchema.parse(record)).not.toThrow();
      expect(record?.identity.assignment_number).toBe(item.id);
      expect(record?.identity.app_name).toBe(item.name);
      expect(record?.evidence_pool).toEqual([]);
      expect(record?.change_log).toEqual([]);
      expect(record?.pipeline_metadata.current_stage).toBe('first_pass');
    }
  });

  it('ensures no research, findings, or fabricated accuracy numbers have been added to fixtures', () => {
    for (const item of expectedFixtures) {
      const record = store.getRecord(item.id, item.name);
      expect(record?.first_pass).toBeUndefined();
      expect(record?.final_agent_result).toBeUndefined();
      expect(record?.confidence).toBeUndefined();
      expect(record?.buildability).toBeUndefined();
    }
  });
});
