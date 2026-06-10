import { NextRequest } from 'next/server';
import { getOffsetLimit } from 'services/helpers';

// getOffsetLimit reads `offset`/`limit` from the request query. It lives in a module that pulls in
// env-dependent logging at import, so this runs as an integration test (env is loaded) rather than
// a pure unit test.
const req = (qs: string) => new NextRequest(`http://localhost/api/maps${qs}`);

describe('getOffsetLimit', () => {
  it('defaults to offset 0 and limit 20 when the params are absent', () => {
    expect(getOffsetLimit(req(''))).toEqual({ offset: 0, limit: 20 });
  });

  it('parses valid offset and limit', () => {
    expect(getOffsetLimit(req('?offset=40&limit=50'))).toEqual({ offset: 40, limit: 50 });
  });

  // Invalid/out-of-range values are clamped rather than passed into the SQL LIMIT/OFFSET: a negative
  // limit or offset would make Postgres throw, a tiny limit would let a client page one map at a
  // time, and an unbounded limit would let one request pull the whole table.
  it('clamps a small or negative limit up to the minimum page size', () => {
    expect(getOffsetLimit(req('?limit=-5')).limit).toBe(20);
    expect(getOffsetLimit(req('?limit=1')).limit).toBe(20);
  });

  it('clamps a negative offset up to 0', () => {
    expect(getOffsetLimit(req('?offset=-5')).offset).toBeGreaterThanOrEqual(0);
  });

  it('caps an excessively large limit', () => {
    expect(getOffsetLimit(req('?limit=100000')).limit).toBeLessThanOrEqual(100);
  });
});
