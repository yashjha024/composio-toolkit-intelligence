import fs from 'fs';
import path from 'path';
import {
  CanonicalResearchRecord,
  CanonicalResearchRecordSchema,
  BenchmarkApp,
  BenchmarkDatasetSchema,
} from '../types/schema.js';

export class JsonStore {
  private baseDir: string;
  private recordsDir: string;
  private checkpointFile: string;
  private benchmarkFile: string;

  constructor(baseDir: string = path.resolve(process.cwd(), 'data')) {
    this.baseDir = baseDir;
    this.recordsDir = path.join(this.baseDir, 'records');
    this.checkpointFile = path.join(this.baseDir, 'run_checkpoint.json');
    this.benchmarkFile = path.join(this.baseDir, 'benchmark_100.json');

    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
    if (!fs.existsSync(this.recordsDir)) {
      fs.mkdirSync(this.recordsDir, { recursive: true });
    }
  }

  private getRecordFilename(assignmentNumber: number, appName: string): string {
    const safeName = appName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    const paddedId = String(assignmentNumber).padStart(3, '0');
    return path.join(this.recordsDir, `app_${paddedId}_${safeName}.json`);
  }

  private atomicWriteJson(filePath: string, data: unknown): void {
    const tempFile = `${filePath}.tmp.${Date.now()}`;
    const jsonStr = JSON.stringify(data, null, 2);
    fs.writeFileSync(tempFile, jsonStr, 'utf-8');
    fs.renameSync(tempFile, filePath);
  }

  public saveRecord(record: CanonicalResearchRecord): void {
    const validated = CanonicalResearchRecordSchema.parse(record);
    const filePath = this.getRecordFilename(
      validated.identity.assignment_number,
      validated.identity.app_name
    );
    this.atomicWriteJson(filePath, validated);
  }

  public getRecord(assignmentNumber: number, appName: string): CanonicalResearchRecord | null {
    const filePath = this.getRecordFilename(assignmentNumber, appName);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    try {
      const data = JSON.parse(raw);
      return CanonicalResearchRecordSchema.parse(data);
    } catch {
      return null;
    }
  }

  public getAllRecords(): CanonicalResearchRecord[] {
    if (!fs.existsSync(this.recordsDir)) {
      return [];
    }
    const files = fs.readdirSync(this.recordsDir).filter((f) => f.endsWith('.json'));
    const records: CanonicalResearchRecord[] = [];
    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(this.recordsDir, file), 'utf-8');
        const data = JSON.parse(raw);
        records.push(CanonicalResearchRecordSchema.parse(data));
      } catch {
        // Skip malformed/incomplete temp files
      }
    }
    return records;
  }

  public saveCheckpoint(checkpoint: {
    last_completed_number: number;
    updated_at: string;
    completed_numbers: number[];
  }): void {
    this.atomicWriteJson(this.checkpointFile, checkpoint);
  }

  public getCheckpoint(): {
    last_completed_number: number;
    updated_at: string;
    completed_numbers: number[];
  } | null {
    if (!fs.existsSync(this.checkpointFile)) {
      return null;
    }
    try {
      const raw = fs.readFileSync(this.checkpointFile, 'utf-8');
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  public loadBenchmark(): BenchmarkApp[] {
    if (!fs.existsSync(this.benchmarkFile)) {
      throw new Error(`Benchmark file not found at: ${this.benchmarkFile}`);
    }
    const raw = fs.readFileSync(this.benchmarkFile, 'utf-8');
    const data = JSON.parse(raw);
    return BenchmarkDatasetSchema.parse(data);
  }

  public saveBenchmark(apps: BenchmarkApp[]): void {
    const validated = BenchmarkDatasetSchema.parse(apps);
    this.atomicWriteJson(this.benchmarkFile, validated);
  }
}
