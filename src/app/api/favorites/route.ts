import { getServerContext } from 'services/server_context';
import { getUserSession } from 'services/session/session';
import { getBody } from 'app/api/helpers';
import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, apiResponse } from 'schema/api';
import {
  GetFavoriteMapsResponse,
  deserializeSetFavoriteMapsRequest,
  serializeGetFavoriteMapsResponse,
} from 'schema/users';

export async function GET() {
  const send = (res: GetFavoriteMapsResponse) =>
    new NextResponse(serializeGetFavoriteMapsResponse(res));

  const user = await getUserSession();
  if (!user) {
    return send({
      success: false,
      statusCode: 403,
      errorMessage: 'You must be logged in to see your favorites',
    });
  }
  const { favoritesRepo } = await getServerContext();
  const result = await favoritesRepo.getFavorites(user.id);
  if (!result.success) {
    return send({
      success: false,
      statusCode: 500,
      errorMessage: 'Unknown error when retrieving favorites, please try again later',
    });
  }

  return send({ success: true, maps: result.value });
}

export async function POST(req: NextRequest) {
  const send = (res: ApiResponse) => new NextResponse(apiResponse.serialize(res));

  const user = await getUserSession();
  if (!user) {
    return send({
      success: false,
      statusCode: 403,
      errorMessage: 'You must be logged in to see your favorites',
    });
  }

  const setFavoriteMapsReq = await getBody(req, deserializeSetFavoriteMapsRequest);

  const { favoritesRepo } = await getServerContext();
  const result = await favoritesRepo.setFavorites(
    user.id,
    setFavoriteMapsReq.mapIds,
    setFavoriteMapsReq.isFavorite
  );

  if (!result.success) {
    return send({
      success: false,
      statusCode: 500,
      errorMessage: 'Unknown error when setting favorites, please try again later',
    });
  }
  return send({ success: true });
}
