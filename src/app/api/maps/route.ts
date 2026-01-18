import { getQueryParams, joinErrors } from 'app/api/helpers';
import { NextRequest, NextResponse } from 'next/server';
import { FindMapsResponse, MapSortableAttributes, mapSortableAttributes } from 'schema/maps';
import { getOffsetLimit } from 'services/helpers';
import { getServerContext } from 'services/server_context';
import { getUserSession } from 'services/session/session';

const send = (res: FindMapsResponse) => NextResponse.json(FindMapsResponse.parse(res));
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { query, sort: _sort, sortDirection: _sortDirection } = getQueryParams(req);
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
