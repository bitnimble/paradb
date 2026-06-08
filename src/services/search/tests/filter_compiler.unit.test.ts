import { FilterNode } from 'schema/map_filter';
import { compileFilter } from 'services/search/filter_compiler';

const compile = (node: FilterNode) => compileFilter(node).compile();

describe('compileFilter', () => {
  it('compiles an eq comparison with a bound parameter', () => {
    const { text, values } = compile({ type: 'cmp', field: 'title', op: 'eq', value: 'All Star' });
    expect(text).toContain('"title"');
    expect(text).toContain('=');
    expect(text).toContain('$1');
    expect(values).toEqual(['All Star']);
  });

  it('compiles numeric comparisons', () => {
    const { text, values } = compile({
      type: 'cmp',
      field: 'downloadCount',
      op: 'gte',
      value: 3,
    });
    expect(text).toContain('"download_count"');
    expect(text).toContain('>=');
    expect(values).toEqual([3]);
  });

  it('compiles date after as a greater-than comparison', () => {
    const { text } = compile({
      type: 'cmp',
      field: 'submissionDate',
      op: 'after',
      value: '2021-06-01T00:00:00.000Z',
    });
    expect(text).toContain('"submission_date"');
    expect(text).toContain('>');
    expect(text).not.toContain('>=');
  });

  it('compiles date comparisons against the timestamptz column, anchoring a bare date to UTC', () => {
    const { text, values } = compile({
      type: 'cmp',
      field: 'submissionDate',
      op: 'before',
      value: '2021-06-03',
    });
    expect(text).toContain('"submission_date"');
    expect(text).toContain('::timestamptz');
    // A bare date is anchored to midnight UTC rather than left to the session timezone.
    expect(values).toEqual(['2021-06-03T00:00:00Z']);
  });

  it('passes a full ISO date value through unchanged', () => {
    const { values } = compile({
      type: 'cmp',
      field: 'submissionDate',
      op: 'after',
      value: '2021-06-01T12:00:00.000Z',
    });
    expect(values).toEqual(['2021-06-01T12:00:00.000Z']);
  });

  it('compiles neq as IS DISTINCT FROM so NULL rows are not silently dropped', () => {
    const { text } = compile({ type: 'cmp', field: 'author', op: 'neq', value: 'anon' });
    expect(text).toContain('IS DISTINCT FROM');
    expect(text).not.toContain('!=');
  });

  it('compiles contains as an ILIKE with surrounding wildcards', () => {
    const { text, values } = compile({
      type: 'cmp',
      field: 'artist',
      op: 'contains',
      value: 'Smash',
    });
    expect(text).toContain('ILIKE');
    expect(values).toEqual(['%Smash%']);
  });

  it('compiles startsWith as an ILIKE with a trailing wildcard', () => {
    const { values } = compile({
      type: 'cmp',
      field: 'artist',
      op: 'startsWith',
      value: 'Smash',
    });
    expect(values).toEqual(['Smash%']);
  });

  it('escapes LIKE wildcards in user values', () => {
    const { values } = compile({
      type: 'cmp',
      field: 'description',
      op: 'contains',
      value: '100%_\\done',
    });
    // %, _ and \ are escaped so they match literally; our own surrounding %s remain.
    expect(values).toEqual(['%100\\%\\_\\\\done%']);
  });

  it('compiles tags has as an array membership test', () => {
    const { text, values } = compile({ type: 'cmp', field: 'tags', op: 'has', value: 'Rock' });
    expect(text).toContain('ANY');
    expect(text).toContain('"tags"');
    expect(values).toEqual(['Rock']);
  });

  it('compiles a countable count as a correlated subquery against the related table', () => {
    const { text, values } = compile({
      type: 'cmp',
      field: 'difficulties',
      op: 'count',
      value: 4,
    });
    expect(text).toContain('count(*)');
    expect(text).toContain('"difficulties"');
    // Correlated back to the outer maps row.
    expect(text).toContain('"maps"."id"');
    expect(text).toContain('=');
    expect(values).toEqual([4]);
  });

  it('compiles an AND group', () => {
    const { text, values } = compile({
      type: 'and',
      children: [
        { type: 'cmp', field: 'artist', op: 'eq', value: 'a' },
        { type: 'cmp', field: 'author', op: 'eq', value: 'b' },
      ],
    });
    expect(text).toContain('AND');
    expect(values).toEqual(['a', 'b']);
  });

  it('compiles an OR group', () => {
    const { text } = compile({
      type: 'or',
      children: [
        { type: 'cmp', field: 'artist', op: 'eq', value: 'a' },
        { type: 'cmp', field: 'author', op: 'eq', value: 'b' },
      ],
    });
    expect(text).toContain('OR');
  });

  it('compiles a NOT node', () => {
    const { text } = compile({
      type: 'not',
      child: { type: 'cmp', field: 'artist', op: 'eq', value: 'a' },
    });
    expect(text).toContain('NOT');
  });
});
