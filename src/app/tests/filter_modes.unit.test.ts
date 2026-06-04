import { FilterNode } from 'schema/map_filter';
import {
  SimpleFilter,
  extractSimpleFilter,
  nodeToSimpleFilter,
  simpleFilterToNode,
} from 'app/filter_modes';

describe('simpleFilterToNode', () => {
  it('returns undefined when all fields are blank', () => {
    expect(simpleFilterToNode({})).toBeUndefined();
    expect(simpleFilterToNode({ artist: '  ' })).toBeUndefined();
  });

  it('compiles non-blank text fields to contains cmps under an and', () => {
    const node = simpleFilterToNode({ artist: 'Smash', description: 'star' });
    expect(node).toEqual({
      type: 'and',
      children: [
        { type: 'cmp', field: 'artist', op: 'contains', value: 'Smash' },
        { type: 'cmp', field: 'description', op: 'contains', value: 'star' },
      ],
    });
  });

  it('compiles date fields to submissionDate before/after', () => {
    const node = simpleFilterToNode({ after: '2021-01-01', before: '2021-12-31' });
    expect(node).toEqual({
      type: 'and',
      children: [
        { type: 'cmp', field: 'submissionDate', op: 'after', value: '2021-01-01' },
        { type: 'cmp', field: 'submissionDate', op: 'before', value: '2021-12-31' },
      ],
    });
  });
});

describe('nodeToSimpleFilter', () => {
  it('round-trips a simple-shaped filter', () => {
    const simple: SimpleFilter = { artist: 'Smash', after: '2021-01-01' };
    const node = simpleFilterToNode(simple)!;
    expect(nodeToSimpleFilter(node)).toEqual(simple);
  });

  it('accepts a bare single cmp', () => {
    const node: FilterNode = { type: 'cmp', field: 'author', op: 'contains', value: 'anon' };
    expect(nodeToSimpleFilter(node)).toEqual({ author: 'anon' });
  });

  it('rejects an OR node', () => {
    const node: FilterNode = {
      type: 'or',
      children: [
        { type: 'cmp', field: 'artist', op: 'contains', value: 'a' },
        { type: 'cmp', field: 'author', op: 'contains', value: 'b' },
      ],
    };
    expect(nodeToSimpleFilter(node)).toBeUndefined();
  });

  it('rejects a NOT node', () => {
    const node: FilterNode = {
      type: 'not',
      child: { type: 'cmp', field: 'artist', op: 'contains', value: 'a' },
    };
    expect(nodeToSimpleFilter(node)).toBeUndefined();
  });

  it('rejects an unsupported field/op (e.g. complexity gte)', () => {
    const node: FilterNode = {
      type: 'and',
      children: [{ type: 'cmp', field: 'complexity', op: 'gte', value: 3 }],
    };
    expect(nodeToSimpleFilter(node)).toBeUndefined();
  });

  it('rejects a non-contains op on a text field', () => {
    const node: FilterNode = {
      type: 'and',
      children: [{ type: 'cmp', field: 'artist', op: 'eq', value: 'a' }],
    };
    expect(nodeToSimpleFilter(node)).toBeUndefined();
  });

  it('rejects a duplicated simple field (two artist clauses)', () => {
    const node: FilterNode = {
      type: 'and',
      children: [
        { type: 'cmp', field: 'artist', op: 'contains', value: 'a' },
        { type: 'cmp', field: 'artist', op: 'contains', value: 'b' },
      ],
    };
    expect(nodeToSimpleFilter(node)).toBeUndefined();
  });

  it('rejects nested groups', () => {
    const node: FilterNode = {
      type: 'and',
      children: [
        {
          type: 'and',
          children: [{ type: 'cmp', field: 'artist', op: 'contains', value: 'a' }],
        },
      ],
    };
    expect(nodeToSimpleFilter(node)).toBeUndefined();
  });
});

describe('extractSimpleFilter', () => {
  it('collects simple-representable cmps from an OR tree, dropping the rest', () => {
    const node: FilterNode = {
      type: 'or',
      children: [
        { type: 'cmp', field: 'artist', op: 'contains', value: 'Smash' },
        { type: 'cmp', field: 'complexity', op: 'gte', value: 3 },
        { type: 'not', child: { type: 'cmp', field: 'author', op: 'contains', value: 'anon' } },
      ],
    };
    // artist is kept; complexity (unsupported) and the negated author clause are dropped.
    expect(extractSimpleFilter(node)).toEqual({ artist: 'Smash' });
  });

  it('keeps the first occurrence per slot', () => {
    const node: FilterNode = {
      type: 'and',
      children: [
        { type: 'cmp', field: 'artist', op: 'contains', value: 'first' },
        { type: 'cmp', field: 'artist', op: 'contains', value: 'second' },
      ],
    };
    expect(extractSimpleFilter(node)).toEqual({ artist: 'first' });
  });
});
