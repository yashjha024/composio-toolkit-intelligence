import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import { WebFetcherProvider, WebPageContent } from '../types.js';

export class FastCheerioFetcherProvider implements WebFetcherProvider {
  private turndown: TurndownService;

  constructor(private userAgent: string = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36') {
    this.turndown = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
    });
    this.turndown.remove(['script', 'style', 'noscript', 'svg', 'iframe', 'header', 'footer', 'nav']);
  }

  public async fetchPage(url: string): Promise<WebPageContent> {
    const redirectChain: string[] = [url];
    let currentUrl = url;
    let status = 0;
    let rawHtml = '';

    try {
      const response = await fetch(currentUrl, {
        method: 'GET',
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        redirect: 'follow',
        timeout: 15000,
      });

      status = response.status;
      const finalUrl = response.url;
      if (finalUrl && finalUrl !== currentUrl && !redirectChain.includes(finalUrl)) {
        redirectChain.push(finalUrl);
      }

      if (response.ok) {
        rawHtml = await response.text();
      }
    } catch (err: any) {
      status = err.status || 500;
    }

    if (!rawHtml) {
      return {
        url: redirectChain[redirectChain.length - 1] || url,
        status,
        redirectChain,
        rawHtml: '',
        markdown: '',
        title: '',
      };
    }

    const $ = cheerio.load(rawHtml);
    const title = $('title').text().trim() || $('h1').first().text().trim() || url;

    // Clean up DOM before turndown
    $('script, style, noscript, svg, iframe, header, footer, nav, .sidebar, .nav, .footer').remove();

    let markdown = '';
    try {
      const bodyHtml = $('body').html() || $.root().html() || rawHtml;
      markdown = this.turndown.turndown(bodyHtml);
    } catch {
      markdown = $('body').text().replace(/\s+/g, ' ').trim();
    }

    // Truncate overly massive pages to keep LLM context practical (< 50,000 characters)
    if (markdown.length > 50000) {
      markdown = markdown.slice(0, 50000) + '\n\n...[TRUNCATED_FOR_CONTEXT]...';
    }

    return {
      url: redirectChain[redirectChain.length - 1] || url,
      status,
      redirectChain,
      rawHtml,
      markdown,
      title,
    };
  }
}
