import { MapVisibility } from 'schema/maps';
import { getDbPool } from 'services/db/pool';
import * as db from 'zapatos/db';
import { MapDocument, SearchIndex, SearchOptions, SearchResult } from './types';

// Valid sortable fields mapping to snake_case column names
type SortableColumn = 'title' | 'artist' | 'author' | 'submission_date' | 'download_count';
const SORTABLE_FIELDS: Record<string, SortableColumn> = {
  title: 'title',
  artist: 'artist',
  author: 'author',
  submissionDate: 'submission_date',
  downloadCount: 'download_count',
};

export class PostgresIndex implements SearchIndex {
  async search(query: string, options?: SearchOptions): Promise<SearchResult> {
    console.log('searching with postgres');
    const pool = await getDbPool();

    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 20;
    const searchPattern = `%${query}%`;

    // Build order option from sort, default to most recent submissions
    let order: { by: SortableColumn; direction: 'ASC' | 'DESC' } = {
      by: 'submission_date',
      direction: 'DESC',
    };
    if (options?.sort && options.sort.length > 0) {
      const [field, direction] = options.sort[0].split(':');
      const columnName = SORTABLE_FIELDS[field];
      if (columnName) {
        order = {
          by: columnName,
          direction: direction.toUpperCase() === 'DESC' ? 'DESC' : 'ASC',
        };
      }
    }

    const results = await db
      .select(
        'maps',
        db.conditions.and(
          { visibility: MapVisibility.PUBLIC },
          db.conditions.or(
            { title: db.conditions.ilike(searchPattern) },
            { artist: db.conditions.ilike(searchPattern) }
          )
        ),
        {
          columns: ['id'],
          order,
          limit,
          offset,
        }
      )
      .run(pool);

    return {
      hits: results.map((r) => ({ id: r.id })),
    };
  }

  async updateDocuments(_documents: MapDocument[]): Promise<void> {
    // No-op: data is already in Postgres
  }

  async deleteDocument(_id: string): Promise<void> {
    // No-op: deletion is handled by the maps repo directly
  }
}
