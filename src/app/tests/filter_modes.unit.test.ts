import { FilterNode } from 'schema/map_filter';
import {
  SimpleField,
  getFieldValue,
  isSimpleFilter,
  setFieldValue,
  toSimpleFilter,
} from 'app/filter_modes';

const artist: SimpleField = { field: 'artist', op: 'contains' };
const author: SimpleField = { field: 'author', op: 'contains' };
const after: SimpleField = { field: 'submissionDate', op: 'after' };
const difficulties: SimpleField = { field: 'difficulties', op: 'count' };

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

  it('rejects OR and NOT nodes', () => {
    expect(
      isSimpleFilter({
        type: 'or',
        children: [{ type: 'cmp', field: 'artist', op: 'contains', value: 'a' }],
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

describe('getFieldValue / setFieldValue', () => {
  it('returns an empty string for an absent field', () => {
    expect(getFieldValue(undefined, artist)).toBe('');
  });

  it('adds a field, building a flat and', () => {
    const filter = setFieldValue(undefined, artist, 'Smash');
    expect(filter).toEqual({
      type: 'and',
      children: [{ type: 'cmp', field: 'artist', op: 'contains', value: 'Smash' }],
    });
    expect(getFieldValue(filter, artist)).toBe('Smash');
  });

  it('updates an existing field in place without touching others', () => {
    let filter = setFieldValue(undefined, artist, 'Smash');
    filter = setFieldValue(filter, after, '2021-01-01');
    filter = setFieldValue(filter, artist, 'Mouth');
    expect(filter).toEqual({
      type: 'and',
      children: [
        { type: 'cmp', field: 'artist', op: 'contains', value: 'Mouth' },
        { type: 'cmp', field: 'submissionDate', op: 'after', value: '2021-01-01' },
      ],
    });
  });

  it('coerces a numeric simple field value to a number in the AST', () => {
    const filter = setFieldValue(undefined, difficulties, '4');
    expect(filter).toEqual({
      type: 'and',
      children: [{ type: 'cmp', field: 'difficulties', op: 'count', value: 4 }],
    });
    // Reads back as a string for display in the widget.
    expect(getFieldValue(filter, difficulties)).toBe('4');
  });

  it('clears a field when set to blank, and drops the filter when none remain', () => {
    let filter = setFieldValue(undefined, artist, 'Smash');
    filter = setFieldValue(filter, author, 'anon');
    filter = setFieldValue(filter, artist, '   ');
    expect(filter).toEqual({
      type: 'and',
      children: [{ type: 'cmp', field: 'author', op: 'contains', value: 'anon' }],
    });
    expect(setFieldValue(filter, author, '')).toBeUndefined();
  });
});

describe('toSimpleFilter', () => {
  it('collects simple-representable cmps from an OR tree, dropping the rest', () => {
    const node: FilterNode = {
      type: 'or',
      children: [
        { type: 'cmp', field: 'artist', op: 'contains', value: 'Smash' },
        { type: 'cmp', field: 'downloadCount', op: 'gte', value: 3 },
        { type: 'not', child: { type: 'cmp', field: 'author', op: 'contains', value: 'anon' } },
      ],
    };
    // artist is kept; downloadCount (not a slot) and the negated author clause are dropped.
    expect(toSimpleFilter(node)).toEqual({
      type: 'and',
      children: [{ type: 'cmp', field: 'artist', op: 'contains', value: 'Smash' }],
    });
  });

  it('keeps the first occurrence per slot', () => {
    const node: FilterNode = {
      type: 'and',
      children: [
        { type: 'cmp', field: 'artist', op: 'contains', value: 'first' },
        { type: 'cmp', field: 'artist', op: 'contains', value: 'second' },
      ],
    };
    expect(toSimpleFilter(node)).toEqual({
      type: 'and',
      children: [{ type: 'cmp', field: 'artist', op: 'contains', value: 'first' }],
    });
  });

  it('returns undefined when nothing is representable', () => {
    const node: FilterNode = {
      type: 'not',
      child: { type: 'cmp', field: 'artist', op: 'contains', value: 'a' },
    };
    expect(toSimpleFilter(node)).toBeUndefined();
  });
});
