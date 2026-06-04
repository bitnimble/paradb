import { FilterNode } from 'schema/map_filter';
import { MapSortableAttributes, PDMap } from 'schema/maps';

// Input type for indexing maps - accepts PDMap or partial with required id
export type MapDocument = Partial<PDMap> & { id: string };

// Search result - returns matching IDs
export type SearchResult = {
  hits: Array<{ id: string }>;
};

export type SortOption = {
  attribute: MapSortableAttributes;
  direction: 'asc' | 'desc';
};

// Search options
export type SearchOptions = {
  offset?: number;
  limit?: number;
  sort?: SortOption[];
  // Backend-agnostic filter AST; each backend compiles the same tree its own way.
  filter?: FilterNode;
};

// Generic search index interface for maps
export interface SearchIndex {
  search(query: string, options?: SearchOptions): Promise<SearchResult>;
  updateDocuments(documents: MapDocument[]): Promise<void>;
  deleteDocument(id: string): Promise<void>;
}
