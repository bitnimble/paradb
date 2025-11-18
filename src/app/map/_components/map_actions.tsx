'use client';

import { useApi } from 'app/api/api_provider';
import { createSubmitMapPage } from 'app/map/_components/create';
import { MapPagePresenter, MapPageStore } from 'app/map/_components/map_presenter';
import { action } from 'mobx';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { PDMap } from 'schema/maps';
import { useSession } from 'session/session_provider';
import { Button } from 'ui/base/button/button';
import { createDialog } from 'ui/base/dialog/create';
import { getMapFileLink } from 'utils/maps';
import styles from './map_page.module.css';
import { useRouter } from 'next/navigation';

type MapActionsProps = {
  map: PDMap;
};

export const MapActions = observer((props: MapActionsProps) => {
  const sessionStore = useSession();
  const api = useApi();
  const router = useRouter();
  const [store] = React.useState(new MapPageStore(props.map));
  const presenter = new MapPagePresenter(api, store);

  const canModify = !!sessionStore.user && store.map.uploader === sessionStore.user.id;
  const downloadLink = props.map ? getMapFileLink(props.map.id) : undefined;
  const isFavorited = store.map.userProjection?.isFavorited;

  const showReuploadDialog = action(() => {
    const SubmitMap = createSubmitMapPage(api, router, store.map.id);
    store.ReuploadDialog = createDialog(
      SubmitMap,
      action(() => (store.ReuploadDialog = undefined))
    );
  });

  return (
    <div className={styles.actions}>
      {!!sessionStore.user && isFavorited != null && (
        <Button onClick={presenter.toggleFavorite} style={isFavorited ? 'active' : 'regular'}>
          ❤
        </Button>
      )}
      {downloadLink && <Button link={downloadLink}>Download</Button>}
      {canModify && (
        <>
          <Button onClick={showReuploadDialog}>Reupload</Button>
          <Button style="error" onClick={presenter.deleteMap}>
            Delete
          </Button>
        </>
      )}
      {store.ReuploadDialog && <store.ReuploadDialog />}
    </div>
  );
});
