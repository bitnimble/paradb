'use client';

import { useApi } from 'app/api/api_provider';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { PDMap } from 'schema/maps';
import { Button } from 'ui/base/button/button';
import { Dialog } from 'ui/base/dialog/dialog';
import { SubmitMap } from 'ui/maps/submit/submit_map';
import { useSession } from 'ui/session/session_provider';
import { getMapFileLink } from 'utils/maps';
import styles from './map_page.module.css';
import { MapPagePresenter, MapPageStore } from './map_presenter';

export const MapActions = observer((props: { map: PDMap }) => {
  const session = useSession();
  const api = useApi();
  const store = useLocalObservable(() => new MapPageStore(props.map));
  const presenter = new MapPagePresenter(api, store);

  const canModify = session && store.map.uploader === session.id;
  const downloadLink = props.map ? getMapFileLink(props.map.id) : undefined;
  const isFavorited = store.map.userProjection?.isFavorited;
  return (
    <div className={styles.actions}>
      {session && isFavorited != null && (
        <Button
          onClick={presenter.onToggleFavorite}
          loading={store.updatingFavorite}
          style={isFavorited ? 'active' : 'regular'}
        >
          {store.updatingFavorite ? '' : '❤'}
        </Button>
      )}
      {downloadLink && <Button link={downloadLink}>Download</Button>}
      {canModify && (
        <>
          <Dialog Body={<SubmitMap id={store.map.id} />}>
            <Button>Reupload</Button>
          </Dialog>
          <Button style="error" onClick={presenter.onDeleteMap}>
            Delete
          </Button>
        </>
      )}
      {store.ReuploadDialog && <store.ReuploadDialog />}
    </div>
  );
});
