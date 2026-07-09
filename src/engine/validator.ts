import { EvidenceRecord } from '../types/schema.js';
import { WebFetcherProvider, WebPageContent } from '../providers/types.js';

export class EvidenceValidator {
  private pageCache = new Map<string, WebPageContent>();

  constructor(private fetcher: WebFetcherProvider) {}

  public async getCachedOrFetch(url: string): Promise<WebPageContent> {
    if (this.pageCache.has(url)) {
      return this.pageCache.get(url)!;
    }
    const content = await this.fetcher.fetchPage(url);
    this.pageCache.set(url, content);
    return content;
  }

  private normalizeText(raw: string): string {
    return raw
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  private computeLevenshteinRatio(s1: string, s2: string): number {
    if (!s1 || !s2) return 0;
    if (s1 === s2) return 1.0;
    const len1 = s1.length;
    const len2 = s2.length;
    if (Math.abs(len1 - len2) / Math.max(len1, len2) > 0.3) return 0; // Quick exit for huge length diff

    const dp = Array.from({ length: len1 + 1 }, () => Array(len2 + 1).fill(0));
    for (let i = 0; i <= len1; i++) dp[i][0] = i;
    for (let j = 0; j <= len2; j++) dp[0][j] = j;

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost
        );
      }
    }
    const maxLen = Math.max(len1, len2);
    return (maxLen - dp[len1][len2]) / maxLen;
  }

  private checkSnippetMatch(snippet: string, pageText: string): {
    exact_match: boolean;
    normalized_match: boolean;
    fuzzy_match_score?: number;
    match_type: 'exact' | 'normalized' | 'fuzzy' | 'not_found';
  } {
    if (!snippet || !pageText) {
      return { exact_match: false, normalized_match: false, match_type: 'not_found' };
    }

    // 1. Exact match
    if (pageText.includes(snippet)) {
      return { exact_match: true, normalized_match: true, match_type: 'exact' };
    }

    // 2. Normalized match
    const normSnippet = this.normalizeText(snippet);
    const normPage = this.normalizeText(pageText);

    if (normPage.includes(normSnippet)) {
      return { exact_match: false, normalized_match: true, match_type: 'normalized' };
    }

    // 3. Fuzzy match (check paragraph windows of approximate length)
    const paragraphs = normPage.split(/\n+/).filter((p) => p.length >= Math.min(20, normSnippet.length * 0.5));
    let maxScore = 0;

    for (const p of paragraphs) {
      if (Math.abs(p.length - normSnippet.length) < normSnippet.length * 0.8) {
        const score = this.computeLevenshteinRatio(normSnippet, p);
        if (score > maxScore) maxScore = score;
      }
    }

    if (maxScore >= 0.85) {
      return {
        exact_match: false,
        normalized_match: false,
        fuzzy_match_score: Number(maxScore.toFixed(2)),
        match_type: 'fuzzy',
      };
    }

    return { exact_match: false, normalized_match: false, match_type: 'not_found' };
  }

  public async validateEvidence(record: EvidenceRecord): Promise<EvidenceRecord> {
    let urlResolves = false;
    let statusCode: number | undefined = undefined;
    let redirectChain: string[] = [record.source_url];
    let pageText = '';

    try {
      new URL(record.source_url);
    } catch {
      return {
        ...record,
        url_status: { format_valid: false, resolves: false, redirect_chain: [] },
        snippet_match_status: { exact_match: false, normalized_match: false, match_type: 'not_found' },
      };
    }

    try {
      const page = await this.getCachedOrFetch(record.source_url);
      urlResolves = page.status >= 200 && page.status < 400;
      statusCode = page.status;
      redirectChain = page.redirectChain.length ? page.redirectChain : [record.source_url];
      pageText = page.markdown || page.rawHtml;
    } catch {
      urlResolves = false;
    }

    const matchStatus = this.checkSnippetMatch(record.evidence_snippet, pageText);

    return {
      ...record,
      url_status: {
        format_valid: true,
        resolves: urlResolves,
        status_code: statusCode,
        redirect_chain: redirectChain,
      },
      snippet_match_status: matchStatus,
    };
  }
}
