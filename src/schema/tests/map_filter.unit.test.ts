import {
  FILTER_FIELDS,
  FilterNode,
  decodeFilter,
  encodeFilter,
  normalizeFilter,
} from 'schema/map_filter';

describe('map_filter schema', () => {
  describe('FILTER_FIELDS registry', () => {
    it('does not expose sensitive authorization columns', () => {
      // The entire design assumes a user cannot reference these columns; they are
      // forced to PUBLIC/VALID server-side. Guard against future drift.
      const fields = Object.keys(FILTER_FIELDS);
      expect(fields).not.toContain('visibility');
      expect(fields).not.toContain('validity');
    });
  });

  describe('FilterNode validation', () => {
    it('accepts a valid flat string comparison', () => {
      const result = FilterNode.safeParse({
        type: 'cmp',
        field: 'artist',
        op: 'contains',
        value: 'Smash',
      });
      expect(result.success).toBe(true);
    });

    it('accepts a nested boolean tree', () => {
      const result = FilterNode.safeParse({
        type: 'and',
        children: [
          { type: 'cmp', field: 'artist', op: 'contains', value: 'Smash' },
          {
            type: 'or',
            children: [
              { type: 'cmp', field: 'downloadCount', op: 'gte', value: 3 },
              { type: 'not', child: { type: 'cmp', field: 'author', op: 'eq', value: 'anon' } },
            ],
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('rejects an op that is illegal for the field kind', () => {
      const result = FilterNode.safeParse({
        type: 'cmp',
        field: 'downloadCount',
        op: 'contains',
        value: 'x',
      });
      expect(result.success).toBe(false);
    });

    it('rejects a non-numeric value for a number field', () => {
      const result = FilterNode.safeParse({
        type: 'cmp',
        field: 'downloadCount',
        op: 'gte',
        value: 'three',
      });
      expect(result.success).toBe(false);
    });

    it('rejects a numeric value for a string field', () => {
      const result = FilterNode.safeParse({
        type: 'cmp',
        field: 'artist',
        op: 'contains',
        value: 5,
      });
      expect(result.success).toBe(false);
    });

    it('rejects a non-ISO value for a date field', () => {
      const result = FilterNode.safeParse({
        type: 'cmp',
        field: 'submissionDate',
        op: 'after',
        value: 'not-a-date',
      });
      expect(result.success).toBe(false);
    });

    it('rejects lenient Date.parse inputs that are not ISO dates', () => {
      for (const value of ['2021', 'June 1', '2021-13-99']) {
        const result = FilterNode.safeParse({
          type: 'cmp',
          field: 'submissionDate',
          op: 'after',
          value,
        });
        expect(result.success).toBe(false);
      }
    });

    it('accepts a bare YYYY-MM-DD date (from a date input)', () => {
      const result = FilterNode.safeParse({
        type: 'cmp',
        field: 'submissionDate',
        op: 'before',
        value: '2021-06-03',
      });
      expect(result.success).toBe(true);
    });

    it('accepts an ISO value for a date field', () => {
      const result = FilterNode.safeParse({
        type: 'cmp',
        field: 'submissionDate',
        op: 'after',
        value: '2021-06-01T00:00:00.000Z',
      });
      expect(result.success).toBe(true);
    });

    it('rejects an unknown field', () => {
      const result = FilterNode.safeParse({
        type: 'cmp',
        field: 'visibility',
        op: 'eq',
        value: 'P',
      });
      expect(result.success).toBe(false);
    });

    it('rejects a tree exceeding max depth', () => {
      let node: unknown = { type: 'cmp', field: 'artist', op: 'eq', value: 'x' };
      // Wrap 6 deep in `not` nodes; max depth is 5.
      for (let i = 0; i < 6; i++) {
        node = { type: 'not', child: node };
      }
      const result = FilterNode.safeParse(node);
      expect(result.success).toBe(false);
    });

    it('rejects a tree exceeding max node count', () => {
      const children = Array.from({ length: 60 }, () => ({
        type: 'cmp',
        field: 'artist',
        op: 'eq',
        value: 'x',
      }));
      const result = FilterNode.safeParse({ type: 'and', children });
      expect(result.success).toBe(false);
    });
  });

  describe('encodeFilter / decodeFilter', () => {
    it('round-trips a filter tree', () => {
      const node: FilterNode = {
        type: 'and',
        children: [
          { type: 'cmp', field: 'artist', op: 'contains', value: 'Smash Möuth' },
          { type: 'cmp', field: 'downloadCount', op: 'gte', value: 3 },
        ],
      };
      const decoded = decodeFilter(encodeFilter(node));
      expect(decoded.success).toBe(true);
      expect(decoded.success && decoded.value).toEqual(node);
    });

    it('fails to decode garbage', () => {
      expect(decodeFilter('!!!not base64!!!').success).toBe(false);
    });

    it('fails to decode a structurally invalid tree', () => {
      const bad = encodeFilter({
        type: 'cmp',
        field: 'downloadCount',
        op: 'contains',
        value: 'x',
      } as unknown as FilterNode);
      expect(decodeFilter(bad).success).toBe(false);
    });
  });

  describe('normalizeFilter', () => {
    it('returns undefined for an empty group (so an empty OR is not compiled to FALSE)', () => {
      expect(normalizeFilter({ type: 'or', children: [] })).toBeUndefined();
      expect(normalizeFilter({ type: 'and', children: [] })).toBeUndefined();
    });

    it('drops cmps with a blank value and the groups that become empty', () => {
      expect(
        normalizeFilter({
          type: 'and',
          children: [
            { type: 'cmp', field: 'artist', op: 'contains', value: 'Smash' },
            { type: 'cmp', field: 'downloadCount', op: 'gte', value: '' },
          ],
        })
      ).toEqual({
        type: 'and',
        children: [{ type: 'cmp', field: 'artist', op: 'contains', value: 'Smash' }],
      });
      expect(
        normalizeFilter({ type: 'cmp', field: 'downloadCount', op: 'gte', value: '' })
      ).toBeUndefined();
    });

    it('keeps a numeric 0, which is a real value rather than blank', () => {
      const node: FilterNode = { type: 'cmp', field: 'downloadCount', op: 'gte', value: 0 };
      expect(normalizeFilter(node)).toEqual(node);
    });

    it('drops a whitespace-only string value', () => {
      expect(
        normalizeFilter({ type: 'cmp', field: 'artist', op: 'contains', value: '   ' })
      ).toBeUndefined();
    });

    it('trims leading and trailing whitespace from string values', () => {
      expect(
        normalizeFilter({ type: 'cmp', field: 'artist', op: 'contains', value: '  Smash Mouth  ' })
      ).toEqual({ type: 'cmp', field: 'artist', op: 'contains', value: 'Smash Mouth' });
    });
  });
});
