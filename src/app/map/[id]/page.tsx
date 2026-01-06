import { MapActions } from 'app/map/_components/map_actions';
import { MapPage, getAlbumArtUrl, getMapDescription } from 'app/map/_components/map_page';
import NotFound from 'app/not-found';
import { Metadata } from 'next';
import { getServerContext } from 'services/server_context';
import { getUserSession } from 'services/session/session';

export async function generateMetadata(props: {
  params: Promise<{ id: string }>;
}): Promise<Metadata | undefined> {
  const params = await props.params;
  const { mapsRepo } = await getServerContext();
  const result = await mapsRepo.getMap(params.id);
  if (!result.success) {
    return;
  }
  const map = result.value;
  return {
    title: `${map.title} - ParaDB`,
    openGraph: {
      siteName: 'ParaDB',
      title: `${map.title}`,
      images: [getAlbumArtUrl(map)],
      description: map.description ? getMapDescription(map.description) : undefined,
    },
  };
}

export default async (props: { params: Promise<{ id: string }> }) => {
  const params = await props.params;
  const { mapsRepo } = await getServerContext();
  const user = await getUserSession();
  const userId = user?.id;
  const result = await mapsRepo.getMap(params.id, userId);
  if (!result.success) {
    return <NotFound />;
  }
  return <MapPage map={result.value} mapActions={<MapActions map={result.value} />} />;
};
