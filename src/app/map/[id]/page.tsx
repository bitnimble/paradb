import { MapActions } from 'app/map/_components/map_actions';
import { MapPage } from 'app/map/_components/map_page';
import NotFound from 'app/not-found';
import { getServerContext } from 'services/server_context';
import { getUserSession } from 'services/session/session';

export default async ({ params }: { params: { id: string } }) => {
  const { mapsRepo } = await getServerContext();
  const user = await getUserSession();
  const userId = user?.id;
  const result = await mapsRepo.getMap(params.id, userId);
  if (!result.success) {
    return <NotFound />;
  }
  return <MapPage map={result.value} mapActions={<MapActions map={result.value} />} />;
};
