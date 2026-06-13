import { FilterNode } from 'schema/map_filter';
import {
  SimpleField,
  compileSimpleFilter,
  filterToSimpleValues,
  isSimpleFilter,
  simpleFieldKey,
} from 'app/filter_modes';

const artist: SimpleField = { field: 'artist', op: 'contains', multi: true };
const author: SimpleField = { field: 'author', op: 'contains', multi: true };
const description: SimpleField = { field: 'description', op: 'contains' };
const difficulties: SimpleField = { field: 'difficulties', op: 'count', multi: true };
const after: SimpleField = { field: 'submissionDate', op: 'after' };

const values = (entries: [SimpleField, string][]) =>
  new Map(entries.map(([sf, value]) => [simpleFieldKey(sf), value]));

describe('isSimpleFilter', () => {
  it('treats an empty filter as simple', () => {
    expect(isSimpleFilter(undefined)).toBe(true);
  });

  it('accepts a bare single slot cmp', () => {
    expect(isSimpleFilter({ type: 'cmp', field: 'author', op: 'contains', value: 'anon' })).toBe(
      true
    );
  });

  it('accepts a flat and of distinct slots', () => {
    expect(
      isSimpleFilter({
        type: 'and',
        children: [
          { type: 'cmp', field: 'artist', op: 'contains', value: 'a' },
          { type: 'cmp', field: 'submissionDate', op: 'after', value: '2021-01-01' },
        ],
      })
    ).toBe(true);
  });

  it('accepts an OR of comma terms for a multi field', () => {
    expect(
      isSimpleFilter({
        type: 'and',
        children: [
          {
            type: 'or',
            children: [
              { type: 'cmp', field: 'author', op: 'contains', value: 'Foo' },
              { type: 'cmp', field: 'author', op: 'contains', value: 'Bar' },
            ],
          },
        ],
      })
    ).toBe(true);
  });

  it('rejects an OR for a non-multi field', () => {
    expect(
      isSimpleFilter({
        type: 'or',
        children: [
          { type: 'cmp', field: 'description', op: 'contains', value: 'a' },
          { type: 'cmp', field: 'description', op: 'contains', value: 'b' },
        ],
      })
    ).toBe(false);
  });

  it('rejects an OR mixing fields, and NOT nodes', () => {
    expect(
      isSimpleFilter({
        type: 'or',
        children: [
          { type: 'cmp', field: 'artist', op: 'contains', value: 'a' },
          { type: 'cmp', field: 'author', op: 'contains', value: 'b' },
        ],
      })
    ).toBe(false);
    expect(
      isSimpleFilter({
        type: 'not',
        child: { type: 'cmp', field: 'artist', op: 'contains', value: 'a' },
      })
    ).toBe(false);
  });

  it('rejects a non-slot field/op (e.g. downloadCount gte, or artist eq)', () => {
    expect(
      isSimpleFilter({
        type: 'and',
        children: [{ type: 'cmp', field: 'downloadCount', op: 'gte', value: 3 }],
      })
    ).toBe(false);
    expect(
      isSimpleFilter({
        type: 'and',
        children: [{ type: 'cmp', field: 'artist', op: 'eq', value: 'a' }],
      })
    ).toBe(false);
  });

  it('rejects a duplicated field', () => {
    expect(
      isSimpleFilter({
        type: 'and',
        children: [
          { type: 'cmp', field: 'artist', op: 'contains', value: 'a' },
          { type: 'cmp', field: 'artist', op: 'contains', value: 'b' },
        ],
      })
    ).toBe(false);
  });

  it('rejects nested groups', () => {
    expect(
      isSimpleFilter({
        type: 'and',
        children: [
          { type: 'and', children: [{ type: 'cmp', field: 'artist', op: 'contains', value: 'a' }] },
        ],
      })
    ).toBe(false);
  });
});

describe('compileSimpleFilter', () => {
  it('returns undefined for empty / all-blank fields', () => {
    expect(compileSimpleFilter(new Map())).toBeUndefined();
    expect(compileSimpleFilter(values([[artist, '   ']]))).toBeUndefined();
  });

  it('compiles a single term to a bare cmp', () => {
    expect(compileSimpleFilter(values([[artist, 'Smash']]))).toEqual({
      type: 'and',
      children: [{ type: 'cmp', field: 'artist', op: 'contains', value: 'Smash' }],
    });
  });

  it('expands a multi text field on commas into an OR, trimming and dropping blanks', () => {
    expect(compileSimpleFilter(values([[author, 'Foo, , Bar']]))).toEqual({
      type: 'and',
      children: [
        {
          type: 'or',
          children: [
            { type: 'cmp', field: 'author', op: 'contains', value: 'Foo' },
            { type: 'cmp', field: 'author', op: 'contains', value: 'Bar' },
          ],
        },
      ],
    });
  });

  it('does not split a non-multi field (comma is literal)', () => {
    expect(compileSimpleFilter(values([[description, 'a,b']]))).toEqual({
      type: 'and',
      children: [{ type: 'cmp', field: 'description', op: 'contains', value: 'a,b' }],
    });
  });

  it('expands and coerces a multi countable field, dropping non-numeric terms', () => {
    expect(compileSimpleFilter(values([[difficulties, '1, x, 2']]))).toEqual({
      type: 'and',
      children: [
        {
          type: 'or',
          children: [
            { type: 'cmp', field: 'difficulties', op: 'count', value: 1 },
            { type: 'cmp', field: 'difficulties', op: 'count', value: 2 },
          ],
        },
      ],
    });
  });

  it('coerces a single countable term to a number', () => {
    expect(compileSimpleFilter(values([[difficulties, '4']]))).toEqual({
      type: 'and',
      children: [{ type: 'cmp', field: 'difficulties', op: 'count', value: 4 }],
    });
  });

  it('drops a field entirely when no term is valid', () => {
    expect(compileSimpleFilter(values([[difficulties, 'x, y']]))).toBeUndefined();
  });

  it('combines several fields into a flat and', () => {
    expect(
      compileSimpleFilter(
        values([
          [artist, 'Smash'],
          [after, '2021-01-01'],
        ])
      )
    ).toEqual({
      type: 'and',
      children: [
        { type: 'cmp', field: 'artist', op: 'contains', value: 'Smash' },
        { type: 'cmp', field: 'submissionDate', op: 'after', value: '2021-01-01' },
      ],
    });
  });
});

describe('filterToSimpleValues', () => {
  it('returns an empty map for an empty filter', () => {
    expect(filterToSimpleValues(undefined)).toEqual(new Map());
  });

  it('reads a bare cmp slot', () => {
    expect(
      filterToSimpleValues({ type: 'cmp', field: 'artist', op: 'contains', value: 'Smash' })
    ).toEqual(values([[artist, 'Smash']]));
  });

  it('joins a multi field OR slot with commas', () => {
    expect(
      filterToSimpleValues({
        type: 'and',
        children: [
          {
            type: 'or',
            children: [
              { type: 'cmp', field: 'author', op: 'contains', value: 'Foo' },
              { type: 'cmp', field: 'author', op: 'contains', value: 'Bar' },
            ],
          },
        ],
      })
    ).toEqual(values([[author, 'Foo,Bar']]));
  });

  it('round-trips a compiled multi filter back to its raw values', () => {
    const raw = values([
      [author, 'Foo,Bar'],
      [difficulties, '1,2'],
    ]);
    const compiled = compileSimpleFilter(raw);
    expect(filterToSimpleValues(compiled)).toEqual(raw);
  });

  it('salvages simple cmps from an advanced tree, dropping the rest and keeping the first per field', () => {
    const node: FilterNode = {
      type: 'or',
      children: [
        { type: 'cmp', field: 'artist', op: 'contains', value: 'first' },
        { type: 'cmp', field: 'artist', op: 'contains', value: 'second' },
        { type: 'cmp', field: 'downloadCount', op: 'gte', value: 3 },
        { type: 'not', child: { type: 'cmp', field: 'author', op: 'contains', value: 'anon' } },
      ],
    };
    expect(filterToSimpleValues(node)).toEqual(values([[artist, 'first']]));
  });
});
