import NotFound from 'app/not-found';
import { Metadata } from 'next';
import { parse } from 'node-html-parser';
import { getServerContext } from 'services/server_context';
import { getUserSession } from 'services/session/session';
import { MapActions } from './map_actions';
import { MapPageContent, getAlbumArtUrl, getMapDescription } from './map_page_content';

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
  const description = map.description ? getMapDescription(map.description) : '';
  const content = parse(description).innerText;

  return {
    title: `${map.title} - ParaDB`,
    openGraph: {
      siteName: 'ParaDB',
      title: `${map.title}`,
      images: [getAlbumArtUrl(map)],
      description: content,
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
  return <MapPageContent map={result.value} mapActions={<MapActions map={result.value} />} />;
};
