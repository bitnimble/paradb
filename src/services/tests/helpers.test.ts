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
    expect(getOffsetLimit(req('?offset=40&limit=10'))).toEqual({ offset: 40, limit: 10 });
  });

  // RED: review finding #2. getOffsetLimit does no clamping, so these invalid values flow straight
  // into the SQL LIMIT/OFFSET. A negative limit or offset makes Postgres throw, and an unbounded
  // limit lets a single request pull the entire table.
  it('clamps a negative limit up to at least 1', () => {
    expect(getOffsetLimit(req('?limit=-5')).limit).toBeGreaterThanOrEqual(1);
  });

  it('clamps a negative offset up to 0', () => {
    expect(getOffsetLimit(req('?offset=-5')).offset).toBeGreaterThanOrEqual(0);
  });

  it('caps an excessively large limit', () => {
    expect(getOffsetLimit(req('?limit=100000')).limit).toBeLessThanOrEqual(100);
  });
});
