import { runInAction } from 'mobx';
import { observer } from 'mobx-react';
import { Api } from 'pages/paradb/base/api/api';
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
import { PDMap } from 'paradb-api-schema';
import React from 'react';

export function createMapPage(api: Api) {
  const store = new MapPageStore();
  const presenter = new MapPagePresenter(api, store);

  return observer(({ id, map }: { id: string, map: PDMap | undefined }) => {
    useComponentDidMount(() => {
      if (map) {
        runInAction(() => store.map = map);
      } else {
        presenter.getMap(id);
      }
    });

    return (
      <MapPage
        map={store.map}
      />
    );
  });
}

export function createSubmitMapPage(api: Api, navigate: Navigate) {
  const store: SubmitMapStore = new SubmitMapStore();
  const uploader = new ThrottledMapUploader(api);
  const presenter = new SubmitMapPresenter(uploader, navigate, store);
  let mounted = false;

  return observer(() => {
    useComponentDidMount(() => {
      if (!mounted) {
        mounted = true;
      } else {
        store.reset();
        uploader.reset();
      }
    });

    return (
      <SubmitMapPage
        filenames={store.filenames}
        uploadProgress={uploader.uploadProgress}
        isSubmitting={uploader.isUploading}
        onChangeData={presenter.onChangeData}
        onSubmit={presenter.submit}
      />
    );
  });
}
