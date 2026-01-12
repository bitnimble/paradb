import { joinErrors } from 'app/api/helpers';
import { NextRequest, NextResponse } from 'next/server';
import { ApiError } from 'schema/api';
import {
  AdvancedSearchMapRequest,
  AdvancedSearchMapResponse,
  AdvancedSearchMapsResponse,
} from 'schema/maps';
import { getServerContext } from 'services/server_context';

// TODO: make this a GET
export async function POST(
  req: NextRequest
): Promise<NextResponse<AdvancedSearchMapsResponse | ApiError>> {
  const searchReq = AdvancedSearchMapRequest.parse(await req.json());
  // TODO: handle limits
  const { mapsRepo } = await getServerContext();
  const result = await mapsRepo.advancedSearchMaps(searchReq);
  if (!result.success) {
    return NextResponse.json({
      success: false,
      statusCode: 500,
      errorMessage: 'Could not retrieve map: ' + joinErrors(result),
    });
  }
  return NextResponse.json(AdvancedSearchMapResponse.parse(result as any));
}
