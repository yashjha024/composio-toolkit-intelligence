import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { JsonStore } from '../lib/store.js';
import { runLocalAudit } from '../cli/run-local-audit.js';

describe('Local Audit & Identity Integrity Verification', () => {
  const baseDir = path.resolve(process.cwd(), 'data');
  const analysisDir = path.join(baseDir, 'analysis');
  let store: JsonStore;

  beforeAll(async () => {
    store = new JsonStore(baseDir);
    await runLocalAudit();
  });

  it('proves all 100 benchmark identities map exactly with no duplicate or missing assignments', () => {
    const benchmarkApps = store.loadBenchmark();
    expect(benchmarkApps).toHaveLength(100);

    const seenNumbers = new Set<number>();
    for (const app of benchmarkApps) {
      expect(typeof app.assignment_number).toBe('number');
      expect(app.assignment_number).toBeGreaterThanOrEqual(1);
      expect(app.assignment_number).toBeLessThanOrEqual(100);
      expect(seenNumbers.has(app.assignment_number)).toBe(false);
      seenNumbers.add(app.assignment_number);
    }
    expect(seenNumbers.size).toBe(100);
  });

  it('proves analysis output (audit_100.json) cannot relabel an assignment number with another app', () => {
    const benchmarkApps = store.loadBenchmark();
    const auditPath = path.join(analysisDir, 'audit_100.json');
    expect(fs.existsSync(auditPath)).toBe(true);

    const auditRows = JSON.parse(fs.readFileSync(auditPath, 'utf-8'));
    expect(auditRows).toHaveLength(100);

    for (const row of auditRows) {
      const bench = benchmarkApps.find((b) => b.assignment_number === row.assignment_number);
      expect(bench).toBeDefined();
      expect(row.app_name).toBe(bench!.app_name);
      expect(row.assigned_category).toBe(bench!.assigned_category);
    }
  });

  it('proves verification sample identities (verification_sample_15.json) exactly match benchmark_100.json', () => {
    const benchmarkApps = store.loadBenchmark();
    const samplePath = path.join(analysisDir, 'verification_sample_15.json');
    expect(fs.existsSync(samplePath)).toBe(true);

    const sampleRows = JSON.parse(fs.readFileSync(samplePath, 'utf-8'));
    expect(sampleRows).toHaveLength(15);

    for (const row of sampleRows) {
      const bench = benchmarkApps.find((b) => b.assignment_number === row.assignment_number);
      expect(bench).toBeDefined();
      expect(row.app_name).toBe(bench!.app_name);
      expect(row.assigned_category).toBe(bench!.assigned_category);
    }
  });

  it('proves deep_verified vs fast_scale counts match exact lifecycle rules', () => {
    const patternPath = path.join(analysisDir, 'pattern_analysis.json');
    const patternData = JSON.parse(fs.readFileSync(patternPath, 'utf-8'));
    expect(patternData.deep_verified_count).toBe(10);
    expect(patternData.fast_scale_count).toBe(90);
    expect(patternData.deep_verified_count + patternData.fast_scale_count).toBe(100);
  });
});
