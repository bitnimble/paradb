import { getServerContext } from 'services/server_context';
import { getUserSession } from 'services/session/session';
import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from 'schema/api';
import { GetFavoriteMapsResponse, SetFavoriteMapsRequest } from 'schema/users';

export async function GET() {
  const send = (res: GetFavoriteMapsResponse) =>
    NextResponse.json(GetFavoriteMapsResponse.parse(res));

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
  const send = (res: ApiResponse) => NextResponse.json(ApiResponse.parse(res));

  const user = await getUserSession();
  if (!user) {
    return send({
      success: false,
      statusCode: 403,
      errorMessage: 'You must be logged in to see your favorites',
    });
  }

  const setFavoriteMapsReq = SetFavoriteMapsRequest.parse(await req.json());

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
