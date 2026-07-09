import { SearchProvider } from '../providers/types.js';

export interface DiscoveredSource {
  url: string;
  title: string;
  priority: number; // 1: Official dev doc, 2: API ref, 3: Auth doc, 4: Pricing/help, 5: GitHub, 6: Seeded/Hint, 10: Other
  reason: string;
}

export class SourceDiscoveryEngine {
  constructor(private searchProvider: SearchProvider) {}

  private cleanWebsiteHint(rawHint: string): string {
    // Remove parenthetical descriptions like "twenty.com (open-source CRM)" -> "twenty.com"
    const cleaned = rawHint.replace(/\(.*?\)/g, '').trim();
    if (!cleaned) return '';
    if (cleaned.startsWith('http')) return cleaned;
    return `https://${cleaned}`;
  }

  private assignPriority(url: string, title: string = ''): { priority: number; reason: string } {
    const lowerUrl = url.toLowerCase();
    const lowerTitle = title.toLowerCase();

    if (lowerUrl.includes('api') || lowerTitle.includes('api reference') || lowerTitle.includes('endpoints')) {
      return { priority: 2, reason: 'Official API reference' };
    }
    if (lowerUrl.includes('auth') || lowerUrl.includes('oauth') || lowerTitle.includes('authentication')) {
      return { priority: 3, reason: 'Official authentication documentation' };
    }
    if (lowerUrl.includes('pricing') || lowerUrl.includes('plans') || lowerTitle.includes('pricing')) {
      return { priority: 4, reason: 'Official pricing/help page' };
    }
    if (lowerUrl.includes('github.com')) {
      return { priority: 5, reason: 'Official or community GitHub repository' };
    }
    if (lowerUrl.includes('docs.') || lowerUrl.includes('developer.') || lowerUrl.includes('/docs') || lowerUrl.includes('/dev')) {
      return { priority: 1, reason: 'Official developer documentation' };
    }
    return { priority: 6, reason: 'Discovered candidate source' };
  }

  public async discoverSources(
    appName: string,
    websiteHint: string,
    seededUrls: string[] = []
  ): Promise<DiscoveredSource[]> {
    const urlMap = new Map<string, DiscoveredSource>();

    // 1. Manually seeded URLs (top priority)
    for (const seeded of seededUrls) {
      if (seeded && seeded.startsWith('http')) {
        const { priority, reason } = this.assignPriority(seeded, 'Manually seeded URL');
        urlMap.set(seeded.toLowerCase(), {
          url: seeded,
          title: `${appName} (Manually Seeded URL)`,
          priority: Math.min(priority, 1),
          reason: `Manually seeded candidate: ${reason}`,
        });
      }
    }

    // 2. Cleaned Website Hint from benchmark
    const cleanedHint = this.cleanWebsiteHint(websiteHint);
    if (cleanedHint) {
      const { priority, reason } = this.assignPriority(cleanedHint, `${appName} Website Hint`);
      if (!urlMap.has(cleanedHint.toLowerCase())) {
        urlMap.set(cleanedHint.toLowerCase(), {
          url: cleanedHint,
          title: `${appName} Website Hint (${websiteHint})`,
          priority: Math.min(priority, 2),
          reason: `Authoritative benchmark website hint: ${reason}`,
        });
      }
    }

    // 3. Search Discovery Queries
    const domainPart = cleanedHint ? new URL(cleanedHint).hostname.replace(/^www\./, '') : '';
    const queries = [
      `${appName} official developer documentation API reference`,
      `${appName} authentication OAuth API key credentials developer`,
      `${appName} MCP model context protocol server site:github.com OR site:${domainPart}`,
      `${appName} REST GraphQL API documentation endpoints`,
    ];

    for (const query of queries) {
      try {
        const results = await this.searchProvider.search(query, 4);
        for (const res of results) {
          const lower = res.url.toLowerCase();
          if (!urlMap.has(lower)) {
            const { priority, reason } = this.assignPriority(res.url, res.title);
            urlMap.set(lower, {
              url: res.url,
              title: res.title,
              priority,
              reason,
            });
          }
        }
      } catch {
        // Search failure should never block research if seeded/hint URLs exist
      }
    }

    // Sort by priority ascending (1 is highest priority)
    return Array.from(urlMap.values()).sort((a, b) => a.priority - b.priority);
  }
}
