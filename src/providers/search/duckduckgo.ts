import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { SearchProvider, SearchResult } from '../types.js';

export class DuckDuckGoSearchProvider implements SearchProvider {
  constructor(private userAgent: string = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36') {}

  public async search(query: string, maxResults: number = 5): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    try {
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      if (!response.ok) {
        return results;
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      $('.result').each((_, el) => {
        if (results.length >= maxResults) return false;
        const titleEl = $(el).find('.result__title a');
        const snippetEl = $(el).find('.result__snippet');
        const rawUrl = titleEl.attr('href');

        if (rawUrl) {
          let cleanUrl = rawUrl;
          if (rawUrl.includes('//duckduckgo.com/l/?uddg=')) {
            try {
              const urlObj = new URL(rawUrl, 'https://duckduckgo.com');
              const uddg = urlObj.searchParams.get('uddg');
              if (uddg) cleanUrl = decodeURIComponent(uddg);
            } catch {
              cleanUrl = rawUrl;
            }
          }

          if (cleanUrl.startsWith('http')) {
            results.push({
              title: titleEl.text().trim() || cleanUrl,
              url: cleanUrl,
              snippet: snippetEl.text().trim() || '',
            });
          }
        }
      });
    } catch (err) {
      // Graceful degraded fallback on network or scraping error
    }
    return results;
  }
}
