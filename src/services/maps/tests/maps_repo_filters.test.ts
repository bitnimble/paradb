import { FilterNode } from 'schema/map_filter';
import { MapVisibility } from 'schema/maps';
import { getServerContext } from 'services/server_context';

// Integration: exercises searchMaps filter compilation against the real (PGlite) database. The
// seed (see supabase/seed.sql) provides maps '1' and '2' (public) and '3' (hidden), all
// "All Star" / "Smash Mouth" with description "All Star is the greatest hit of all time.".
async function insertMap(m: {
  id: string;
  visibility?: MapVisibility;
  title?: string;
  artist?: string;
  author?: string;
  description?: string;
  tags?: string[];
  downloadCount?: number;
  submissionDate?: string;
}) {
  const { pool } = await getServerContext();
  await pool.query(
    `INSERT INTO maps
       (id, visibility, validity, submission_date, title, artist, author, uploader, download_count, description, tags, complexity)
     VALUES ($1, $2, 'valid', $3, $4, $5, $6, 'tester', $7, $8, $9, 1)`,
    [
      m.id,
      m.visibility ?? MapVisibility.PUBLIC,
      m.submissionDate ?? '2022-01-01 00:00:00',
      m.title ?? 'Title',
      m.artist ?? 'Artist',
      m.author ?? null,
      m.downloadCount ?? 0,
      m.description ?? null,
      m.tags ?? null,
    ]
  );
}

async function searchIds(filter: FilterNode, query = '') {
  const { mapsRepo } = await getServerContext();
  const result = await mapsRepo.searchMaps({ query, offset: 0, limit: 50, filter });
  if (!result.success) {
    throw new Error('searchMaps failed');
  }
  return result.value.map((m) => m.id).sort();
}

describe('maps repo search filters', () => {
  it('narrows results with a contains filter and excludes hidden maps', async () => {
    // "Smash Mouth" matches all three seed maps, but '3' is hidden.
    const ids = await searchIds({
      type: 'cmp',
      field: 'artist',
      op: 'contains',
      value: 'Smash Mouth',
    });
    expect(ids).toEqual(['1', '2']);
  });

  it('does not surface a hidden map even when its content matches the filter', async () => {
    // The hidden seed map '3' has a description that matches; it must still be excluded.
    const ids = await searchIds({
      type: 'cmp',
      field: 'description',
      op: 'contains',
      value: 'greatest hit',
    });
    expect(ids).toEqual(['1', '2']);
    expect(ids).not.toContain('3');
  });

  it('filters on a numeric column', async () => {
    await insertMap({ id: '100', artist: 'Numeric', downloadCount: 9 });
    const ids = await searchIds({ type: 'cmp', field: 'downloadCount', op: 'gte', value: 5 });
    expect(ids).toEqual(['100']);
  });

  it('filters on a date range', async () => {
    const ids = await searchIds({
      type: 'and',
      children: [
        { type: 'cmp', field: 'submissionDate', op: 'after', value: '2021-06-01T12:00:00.000Z' },
        { type: 'cmp', field: 'submissionDate', op: 'before', value: '2021-06-03T00:00:00.000Z' },
      ],
    });
    // Only seed map '2' (2021-06-02) is public and within range; '3' (2021-06-03) is hidden anyway.
    expect(ids).toEqual(['2']);
  });

  it('treats the `before` boundary as a strict, timezone-correct exclusive bound on a public map', async () => {
    await insertMap({
      id: '500',
      artist: 'BoundaryTest',
      submissionDate: '2021-06-03T00:00:00.000Z',
    });
    const onBoundary = await searchIds({
      type: 'and',
      children: [
        { type: 'cmp', field: 'artist', op: 'contains', value: 'BoundaryTest' },
        { type: 'cmp', field: 'submissionDate', op: 'before', value: '2021-06-03T00:00:00.000Z' },
      ],
    });
    // `before` compiles to `<`, so a map exactly on the boundary is excluded.
    expect(onBoundary).toEqual([]);
    const justAfter = await searchIds({
      type: 'and',
      children: [
        { type: 'cmp', field: 'artist', op: 'contains', value: 'BoundaryTest' },
        { type: 'cmp', field: 'submissionDate', op: 'before', value: '2021-06-03T00:01:00.000Z' },
      ],
    });
    expect(justAfter).toEqual(['500']);
  });

  it('supports OR composition', async () => {
    const ids = await searchIds({
      type: 'or',
      children: [
        { type: 'cmp', field: 'title', op: 'eq', value: 'All Star' },
        { type: 'cmp', field: 'title', op: 'eq', value: 'All Star 2' },
      ],
    });
    expect(ids).toEqual(['1', '2']);
  });

  it('supports NOT composition', async () => {
    const ids = await searchIds({
      type: 'and',
      children: [
        { type: 'cmp', field: 'artist', op: 'contains', value: 'Smash Mouth' },
        { type: 'not', child: { type: 'cmp', field: 'title', op: 'eq', value: 'All Star' } },
      ],
    });
    expect(ids).toEqual(['2']);
  });

  it('includes rows with a NULL column for a neq filter', async () => {
    // A map with no author must still match "author != anon". NULL is "not anon".
    await insertMap({ id: '400', artist: 'NullAuthorTest', author: undefined });
    const ids = await searchIds({
      type: 'and',
      children: [
        { type: 'cmp', field: 'artist', op: 'contains', value: 'NullAuthorTest' },
        { type: 'cmp', field: 'author', op: 'neq', value: 'anon' },
      ],
    });
    expect(ids).toEqual(['400']);
  });

  it('filters by the number of difficulties', async () => {
    // Seed maps '1' and '2' each have 4 difficulties and are public; '3' has 1 and is hidden.
    const ids = await searchIds({ type: 'cmp', field: 'difficulties', op: 'count', value: 4 });
    expect(ids).toEqual(['1', '2']);
  });

  it('counts difficulties per map without bleeding across maps', async () => {
    const { pool } = await getServerContext();
    await insertMap({ id: '600', artist: 'DiffCount' });
    await pool.query(
      `INSERT INTO difficulties (map_id, difficulty_name) VALUES ('600', 'Easy'), ('600', 'Hard')`
    );
    const matchesTwo = await searchIds({
      type: 'and',
      children: [
        { type: 'cmp', field: 'artist', op: 'contains', value: 'DiffCount' },
        { type: 'cmp', field: 'difficulties', op: 'count', value: 2 },
      ],
    });
    expect(matchesTwo).toEqual(['600']);
    const matchesThree = await searchIds({
      type: 'and',
      children: [
        { type: 'cmp', field: 'artist', op: 'contains', value: 'DiffCount' },
        { type: 'cmp', field: 'difficulties', op: 'count', value: 3 },
      ],
    });
    expect(matchesThree).toEqual([]);
  });

  it('matches array membership for tags', async () => {
    // Seed maps '1' and '2' both carry the "Rock" tag; '3' does too but is hidden.
    const ids = await searchIds({ type: 'cmp', field: 'tags', op: 'has', value: 'Rock' });
    expect(ids).toEqual(['1', '2']);
  });

  it('applies the filter on top of a free-text query', async () => {
    await insertMap({ id: '200', title: 'Unrelated', artist: 'All Star' });
    // FTS query "All Star" matches the seed maps and '200' (artist), but the filter keeps only '200'.
    const ids = await searchIds(
      { type: 'cmp', field: 'title', op: 'eq', value: 'Unrelated' },
      'All Star'
    );
    expect(ids).toEqual(['200']);
  });

  describe('LIKE-wildcard escaping', () => {
    it('treats % in a contains value literally', async () => {
      await insertMap({ id: '300', description: '100% complete' });
      await insertMap({ id: '301', description: '100x complete' });

      const literal = await searchIds({
        type: 'cmp',
        field: 'description',
        op: 'contains',
        value: '100%',
      });
      expect(literal).toEqual(['300']);

      // "100" (no wildcard) matches both literal descriptions.
      const both = await searchIds({
        type: 'cmp',
        field: 'description',
        op: 'contains',
        value: '100',
      });
      expect(both).toEqual(['300', '301']);
    });

    it('treats _ in a contains value literally', async () => {
      await insertMap({ id: '310', description: 'foo_bar' });
      await insertMap({ id: '311', description: 'fooxbar' });

      const literal = await searchIds({
        type: 'cmp',
        field: 'description',
        op: 'contains',
        value: 'foo_bar',
      });
      expect(literal).toEqual(['310']);
    });
  });
});
