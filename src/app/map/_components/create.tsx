import { Api } from 'app/api/api';
import { observer } from 'mobx-react';
import React from 'react';
import { SubmitMapPage } from './submit_map';
import { SubmitMapPresenter, SubmitMapStore, ThrottledMapUploader } from './submit_map_presenter';

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
