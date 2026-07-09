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

describe('Calibration Record Lifecycle Validation', () => {
  const store = new JsonStore(path.resolve(process.cwd(), 'data'));
  const benchmark = store.loadBenchmark();

  const calibrationApps = [
    { id: 1, name: 'Salesforce', file: 'app_001_salesforce.json' },
    { id: 56, name: 'Firecrawl', file: 'app_056_firecrawl.json' },
    { id: 61, name: 'GitHub', file: 'app_061_github.json' },
    { id: 90, name: 'PitchBook', file: 'app_090_pitchbook.json' },
    { id: 92, name: 'Otter AI', file: 'app_092_otter_ai.json' },
  ];

  it('all five calibration record files exist and pass the canonical Zod schema', () => {
    for (const item of calibrationApps) {
      const record = store.getRecord(item.id, item.name);
      expect(record, `Record for ${item.name} (#${item.id}) should exist`).not.toBeNull();
      expect(() => CanonicalResearchRecordSchema.parse(record)).not.toThrow();
    }
  });

  it('identity fields in each calibration record match the immutable benchmark exactly', () => {
    for (const item of calibrationApps) {
      const record = store.getRecord(item.id, item.name);
      const benchmarkEntry = benchmark.find((b) => b.assignment_number === item.id);
      expect(benchmarkEntry, `Benchmark entry for #${item.id} should exist`).toBeDefined();
      expect(record?.identity.assignment_number).toBe(benchmarkEntry!.assignment_number);
      expect(record?.identity.app_name).toBe(benchmarkEntry!.app_name);
      expect(record?.identity.website_hint).toBe(benchmarkEntry!.website_hint);
      expect(record?.identity.assigned_category).toBe(benchmarkEntry!.assigned_category);
    }
  });

  it('research does not mutate assignment identity fields', () => {
    for (const item of calibrationApps) {
      const record = store.getRecord(item.id, item.name);
      // If a first_pass exists, its identity must still match the record-level identity
      if (record?.first_pass) {
        expect(record.first_pass.identity.assignment_number).toBe(record.identity.assignment_number);
        expect(record.first_pass.identity.app_name).toBe(record.identity.app_name);
      }
      // If a final_agent_result exists, its identity must also match
      if (record?.final_agent_result) {
        expect(record.final_agent_result.identity.assignment_number).toBe(record.identity.assignment_number);
        expect(record.final_agent_result.identity.app_name).toBe(record.identity.app_name);
      }
    }
  });

  it('any stored first_pass or final_agent_result sub-objects individually pass Zod schema', () => {
    for (const item of calibrationApps) {
      const raw = JSON.parse(
        fs.readFileSync(path.resolve(process.cwd(), 'data', 'records', item.file), 'utf-8')
      );
      // Verify the top-level record always parses
      expect(() => CanonicalResearchRecordSchema.parse(raw)).not.toThrow();
    }
  });
});
