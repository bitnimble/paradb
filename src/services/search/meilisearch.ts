import { Index, MeiliSearch, SearchResponse } from 'meilisearch';
import { MapDocument, SearchIndex, SearchOptions, SearchResult } from './types';

// Exported for rebuild API route
export type SearchableMap = {
  id: string;
  title?: string;
  artist?: string;
  author?: string;
  uploader?: string;
  downloadCount?: number;
  description?: string;
  submissionDate?: number;
  favorites?: number;
};

function convertToSearchableMap(map: MapDocument): SearchableMap {
  const {
    id,
    title,
    artist,
    author,
    uploader,
    downloadCount,
    description,
    submissionDate,
    favorites,
  } = map;
  return {
    id,
    title,
    artist,
    author: author || '',
    uploader,
    downloadCount,
    description: description || '',
    submissionDate: submissionDate != null ? Number(new Date(submissionDate)) : undefined,
    favorites,
  };
}

// Meilisearch response type with pagination fields
type PaginatedSearchResponse = SearchResponse<SearchableMap> & {
  totalHits?: number;
  page?: number;
  hitsPerPage?: number;
};

export class MeilisearchIndex implements SearchIndex {
  /** Direct access to underlying Meilisearch index for advanced operations */
  readonly _index: Index<SearchableMap>;

  constructor(index: Index<SearchableMap>) {
    this._index = index;
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult> {
    const response = (await this._index.search<SearchableMap>(query, {
      offset: options?.offset,
      limit: options?.limit,
      sort: options?.sort,
      filter: options?.filter,
      page: options?.page,
      hitsPerPage: options?.hitsPerPage,
    })) as PaginatedSearchResponse;

    return {
      hits: response.hits.map((h) => ({ id: h.id })),
      totalHits: response.totalHits,
      page: response.page,
      hitsPerPage: response.hitsPerPage,
    };
  }

  async updateDocuments(documents: MapDocument[]): Promise<void> {
    await this._index
      .updateDocuments(documents.map(convertToSearchableMap), { primaryKey: 'id' })
      .waitTask();
  }

  async deleteDocument(id: string): Promise<void> {
    await this._index.deleteDocument(id);
  }
}

type MeilisearchConfig = {
  host: string;
  apiKey: string;
};

export async function createMeilisearchIndex(
  config: MeilisearchConfig,
  indexName: string
): Promise<MeilisearchIndex> {
  const client = new MeiliSearch({
    host: config.host,
    apiKey: config.apiKey,
  });
  const index = await client.getIndex<SearchableMap>(indexName);
  return new MeilisearchIndex(index);
}

export async function meilisearchIndexExists(
  config: MeilisearchConfig,
  indexName: string
): Promise<boolean> {
  const client = new MeiliSearch({
    host: config.host,
    apiKey: config.apiKey,
  });
  const indexes = await client.getIndexes();
  return indexes.results.some((i) => i.uid === indexName);
}
