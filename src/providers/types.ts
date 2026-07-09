export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface SearchProvider {
  search(query: string, maxResults?: number): Promise<SearchResult[]>;
}

export interface WebPageContent {
  url: string;
  status: number;
  redirectChain: string[];
  rawHtml: string;
  markdown: string;
  title: string;
}

export interface WebFetcherProvider {
  fetchPage(url: string): Promise<WebPageContent>;
}

export interface LlmProvider {
  generateStructured<T>(prompt: string, schema: object, systemInstruction?: string): Promise<T>;
  generateText(prompt: string, systemInstruction?: string): Promise<string>;
}
