import { getQueryParams, joinErrors } from 'app/api/helpers';
import { NextRequest, NextResponse } from 'next/server';
import { decodeFilter } from 'schema/map_filter';
import { FindMapsResponse, MapSortableAttributes, mapSortableAttributes } from 'schema/maps';
import { getOffsetLimit } from 'services/helpers';
import { getServerContext } from 'services/server_context';
import { getUserSession } from 'services/session/session';

const send = (res: FindMapsResponse) => NextResponse.json(FindMapsResponse.parse(res));
export async function GET(req: NextRequest): Promise<NextResponse> {
  const {
    query,
    sort: _sort,
    sortDirection: _sortDirection,
    filter: _filter,
  } = getQueryParams(req);
  if (_sort && !mapSortableAttributes.includes(_sort as MapSortableAttributes)) {
    return send({ success: false, statusCode: 400, errorMessage: `Invalid sort column: ${_sort}` });
  }
  if (_sortDirection && !['asc', 'desc'].includes(_sortDirection as string)) {
    return send({
      success: false,
      statusCode: 400,
      errorMessage: `Invalid sort direction: ${_sortDirection}`,
    });
  }
  const sort = _sort as MapSortableAttributes | undefined;
  const sortDirection = _sortDirection as 'asc' | 'desc' | undefined;

  // Fail loud on a malformed filter (bad base64/JSON/schema or depth/node-count breach).
  let filter;
  if (typeof _filter === 'string' && _filter !== '') {
    const decoded = decodeFilter(_filter);
    if (!decoded.success) {
      return send({ success: false, statusCode: 400, errorMessage: 'Invalid filter' });
    }
    filter = decoded.value;
  }

  const { offset, limit } = getOffsetLimit(req);
  const user = await getUserSession();
  const userId = user?.id;

  const { mapsRepo } = await getServerContext();
  const result = await mapsRepo.searchMaps({
    user: userId,
    query: typeof query === 'string' ? query : '',
    offset,
    limit,
    sort,
    sortDirection,
    filter,
  });

  if (!result.success) {
    return send({
      success: false,
      statusCode: 500,
      errorMessage: 'Could not retrieve map: ' + joinErrors(result),
    });
  }
  return send({ success: true, maps: result.value });
}
