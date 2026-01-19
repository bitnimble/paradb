import { PDMap } from 'schema/maps';

// Input type for indexing maps - accepts PDMap or partial with required id
export type MapDocument = Partial<PDMap> & { id: string };

// Search result - returns IDs and pagination info
export type SearchResult = {
  hits: Array<{ id: string }>;
  totalHits?: number;
  page?: number;
  hitsPerPage?: number;
};

// Search options
export type SearchOptions = {
  offset?: number;
  limit?: number;
  sort?: string[];
  filter?: string;
  page?: number;
  hitsPerPage?: number;
};

// Generic search index interface for maps
export interface SearchIndex {
  search(query: string, options?: SearchOptions): Promise<SearchResult>;
  updateDocuments(documents: MapDocument[]): Promise<void>;
  deleteDocument(id: string): Promise<void>;
}
