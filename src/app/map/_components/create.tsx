import { Api } from 'app/api/api';
import { action, observable, runInAction } from 'mobx';
import { observer } from 'mobx-react';
import React from 'react';
import { PDMap } from 'schema/maps';
import { SessionStore } from 'session/session_presenter';
import { createDialog } from 'ui/base/dialog/create';
import { MapPage } from './map_page';
import { MapPagePresenter, MapPageStore } from './map_presenter';
import { SubmitMapPage } from './submit_map';
import { SubmitMapPresenter, SubmitMapStore, ThrottledMapUploader } from './submit_map_presenter';

export function createMapPage(api: Api, sessionStore: SessionStore) {
  const store = new MapPageStore();
  const presenter = new MapPagePresenter(api, store);
  const ReuploadDialog = observable.box<React.ComponentType>(undefined);
  const showReuploadDialog = action(() => {
    if (!store.map) {
      return;
    }
    const SubmitMap = createSubmitMapPage(api, store.map.id);
    ReuploadDialog.set(createDialog(SubmitMap, presenter.hideReuploadDialog));
    presenter.showReuploadDialog();
  });

  return observer(({ id, map }: { id: string; map: PDMap | undefined }) => {
    if (store.map && store.map.id !== id) {
      runInAction(() => (store.map = undefined));
    }
    React.useEffect(() => {
      if (map) {
        runInAction(() => (store.map = map));
        window.history.replaceState({}, '');
      } else {
        runInAction(() => (store.map = undefined));
        presenter.getMap(id);
      }
    }, []);

    return (
      <MapPage
        map={store.map}
        canModify={
          !!(store.map && sessionStore.user && store.map.uploader === sessionStore.user.id)
        }
        isFavorited={store.map?.userProjection?.isFavorited}
        ReuploadDialog={store.reuploadDialogVisible ? ReuploadDialog.get() : undefined}
        showReuploadDialog={showReuploadDialog}
        deleteMap={presenter.deleteMap}
        toggleFavorite={presenter.toggleFavorite}
      />
    );
  });
}

export function createSubmitMapPage(api: Api, id?: string) {
  const store: SubmitMapStore = new SubmitMapStore(id);
  const uploader = new ThrottledMapUploader(api);
  const presenter = new SubmitMapPresenter(uploader, store);

  return observer(() => {
    React.useEffect(() => {
      // Reset the store state whenever we visit the page
      store.reset();
      uploader.reset();
    }, []);

    return (
      <SubmitMapPage
        filenames={store.filenames}
        uploadProgress={uploader.uploadProgress}
        isUploading={uploader.isUploading}
        showProgressScreen={uploader.isUploading || uploader.hasErrors}
        allowMultipleFileSelect={id == null}
        onChangeData={presenter.onChangeData}
        onSubmit={presenter.submit}
      />
    );
  });
}
