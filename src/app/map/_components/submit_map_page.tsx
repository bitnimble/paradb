import { useApi } from 'app/api/api_provider';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SubmitMapPageContent } from './submit_map_page_content';
import { SubmitMapPresenter, SubmitMapStore, ThrottledMapUploader } from './submit_map_presenter';

export const SubmitMapPage = observer((props: { id?: string }) => {
  const api = useApi();
  const router = useRouter();

  const [store] = useState(new SubmitMapStore(props.id));
  const [uploader] = useState(new ThrottledMapUploader(api));
  const presenter = new SubmitMapPresenter(uploader, store, router);

  useEffect(() => {
    // Reset the store state whenever we visit the page
    store.reset();
    uploader.reset();
  }, [store, uploader]);

  return (
    <SubmitMapPageContent
      filenames={store.filenames}
      uploadProgress={uploader.uploadProgress}
      isUploading={uploader.isUploading}
      showProgressScreen={uploader.isUploading || uploader.hasErrors}
      allowMultipleFileSelect={props.id == null}
      onChangeData={presenter.onChangeData}
      onSubmit={presenter.submit}
    />
  );
});
