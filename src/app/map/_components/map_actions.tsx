'use client';

import { useApi } from 'app/api/api_provider';
import { MapPagePresenter, MapPageStore } from 'app/map/_components/map_presenter';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { PDMap } from 'schema/maps';
import { useSession } from 'session/session_provider';
import { Button } from 'ui/base/button/button';
import { Dialog } from 'ui/base/dialog/dialog';
import { getMapFileLink } from 'utils/maps';
import styles from './map_page.module.css';
import { SubmitMapPage } from './submit_map_page';

type MapActionsProps = {
  map: PDMap;
};

export const MapActions = observer((props: MapActionsProps) => {
  const sessionStore = useSession();
  const api = useApi();
  const [store] = React.useState(new MapPageStore(props.map));
  const presenter = new MapPagePresenter(api, store);

  const canModify = !!sessionStore.user && store.map.uploader === sessionStore.user.id;
  const downloadLink = props.map ? getMapFileLink(props.map.id) : undefined;
  const isFavorited = store.map.userProjection?.isFavorited;
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
          <Dialog Body={<SubmitMapPage id={store.map.id} />}>
            <Button>Reupload</Button>
          </Dialog>
          <Button style="error" onClick={presenter.deleteMap}>
            Delete
          </Button>
        </>
      )}
      {store.ReuploadDialog && <store.ReuploadDialog />}
    </div>
  );
});
