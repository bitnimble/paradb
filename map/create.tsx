import { action, observable, runInAction } from 'mobx';
import { observer } from 'mobx-react';
import { Api } from 'pages/paradb/base/api/api';
import { createDialog } from 'pages/paradb/base/dialog/create';
import { useComponentDidMount } from 'pages/paradb/base/helpers';
import { MapPage } from 'pages/paradb/map/map_page';
import { MapPagePresenter, MapPageStore } from 'pages/paradb/map/map_presenter';
import { SubmitMapPage } from 'pages/paradb/map/submit_map';
import {
  SubmitMapPresenter,
  SubmitMapStore,
  ThrottledMapUploader,
} from 'pages/paradb/map/submit_map_presenter';
import { Navigate } from 'pages/paradb/router/install';
import { SessionStore } from 'pages/paradb/session/session_presenter';
import { PDMap } from 'paradb-api-schema';
import React from 'react';

export function createMapPage(api: Api, navigate: Navigate, sessionStore: SessionStore) {
  const store = new MapPageStore();
  const presenter = new MapPagePresenter(api, navigate, store);
  const ReuploadDialog = observable.box<React.ComponentType>(undefined);
  const showReuploadDialog = action(() => {
    if (!store.map) {
      return;
    }
    const SubmitMap = createSubmitMapPage(api, navigate, store.map.id);
    ReuploadDialog.set(createDialog(SubmitMap, presenter.hideReuploadDialog));
    presenter.showReuploadDialog();
  });

  return observer(({ id, map }: { id: string, map: PDMap | undefined }) => {
    if (store.map && store.map.id !== id) {
      runInAction(() => store.map = undefined);
    }
    useComponentDidMount(() => {
      if (map) {
        runInAction(() => store.map = map);
        window.history.replaceState({}, '');
      } else {
        runInAction(() => store.map = undefined);
        presenter.getMap(id);
      }
    });

    return (
      <MapPage
        map={store.map}
        canModify={!!(store.map && sessionStore.user
          && store.map.uploader === sessionStore.user.id)}
        isFavorited={store
          .map
          ?.userProjection
          ?.isFavorited}
        ReuploadDialog={store.reuploadDialogVisible ? ReuploadDialog.get() : undefined}
        showReuploadDialog={showReuploadDialog}
        deleteMap={presenter.deleteMap}
        toggleFavorite={presenter.toggleFavorite}
      />
    );
  });
}

export function createSubmitMapPage(api: Api, navigate: Navigate, id?: string) {
  const store: SubmitMapStore = new SubmitMapStore(id);
  const uploader = new ThrottledMapUploader(api);
  const presenter = new SubmitMapPresenter(uploader, navigate, store);

  return observer(() => {
    useComponentDidMount(() => {
      // Reset the store state whenever we visit the page
      store.reset();
      uploader.reset();
    });

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
