'use client';

import { useApi } from 'app/api/api_provider';
import classNames from 'classnames';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { useRouter } from 'next/navigation';
import React from 'react';
import { Button } from 'ui/base/button/button';
import { T } from 'ui/base/text/text';
import styles from './submit_map.module.css';
import {
  SubmitMapPresenter,
  SubmitMapStore,
  ThrottledMapUploader,
  UploadState,
  zipTypes,
} from './submit_map_presenter';

export const SubmitMap = observer((props: { id?: string }) => {
  const api = useApi();
  const router = useRouter();
  const store = useLocalObservable(() => new SubmitMapStore(props.id));
  const uploader = useLocalObservable(() => new ThrottledMapUploader(api));
  const presenter = new SubmitMapPresenter(uploader, store, router);

  const [isDraggingOver, setDraggingOver] = React.useState(false);
  const showProgressScreen = uploader.isUploading || uploader.hasErrors;

  const onFileChange = (files: FileList | null) => {
    if (files && files.length) {
      presenter.onChangeData(files);
    }
  };

  const onDrop = (e: React.DragEvent<HTMLInputElement>) => {
    preventDefault(e);
    setDraggingOver(false);
    onFileChange(e.dataTransfer.files);
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFileChange(e.target.files);
  };

  const onDragEnter = (e: React.DragEvent<HTMLInputElement>) => {
    preventDefault(e);
    setDraggingOver(true);
  };

  const onDragLeave = (e: React.DragEvent<HTMLInputElement>) => {
    preventDefault(e);
    setDraggingOver(false);
  };

  const DropInput = observer(() => {
    const { filenames } = store;

    return (
      <button
        className={classNames(
          styles.fileContainer,
          (filenames.length || isDraggingOver) && styles.hasMapData
        )}
      >
        <input
          type="file"
          accept={['zip', ...zipTypes].join(',')}
          multiple={props.id == null}
          onChange={onChange}
          onDrop={onDrop}
          onDragOver={preventDefault}
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
        />
        <div className={styles.filenames}>
          <T.Small>
            {filenames.length
              ? filenames.map((f, i) => <p key={i}>{f}</p>)
              : 'Click or drag to upload your zipped map.'}
          </T.Small>
        </div>
      </button>
    );
  });

  const ProgressBar = observer(({ uploadState }: { uploadState: UploadState }) => {
    if (uploadState.state === 'pending') {
      return <div className={styles.progressContainer}>Pending</div>;
    } else if (uploadState.state === 'success') {
      return <div className={styles.progressContainer}>Done</div>;
    } else if (uploadState.state === 'error') {
      return (
        <div className={classNames(styles.progressContainer, styles.progressError)}>
          Error: {uploadState.errorMessage}
        </div>
      );
    } else if (uploadState.state === 'processing') {
      return <div className={styles.progressContainer}>Processing map...</div>;
    }
    return (
      <div className={classNames(styles.progressContainer, styles.progressBar)}>
        <div
          className={classNames(styles.progressInner)}
          style={{ width: `${uploadState.progress * 100}%` }}
        ></div>
      </div>
    );
  });

  return (
    <div className={styles.submitMap}>
      <T.Medium>
        Maps need to be in the .zip format, and need to have the following folder structure:
      </T.Medium>
      <T.Medium style="code" display="block">
        {`YourSongName.zip
├─ YourSongName/
│  ├─ YourSongName_Easy.rlrr
│  ├─ YourSongName_Medium.rlrr
│  ├─ YourSongName_Hard.rlrr
│  ├─ YourSongName_Expert.rlrr
│  ├─ drums.ogg
│  ├─ ...`}
      </T.Medium>
      <T.Medium>The maximum file size is 40MB.</T.Medium>
      {showProgressScreen ? (
        <div className={classNames(styles.fileContainer, styles.hasMapData, styles.isSubmitting)}>
          <div className={styles.filenames}>
            {uploader.uploadProgress.map((p, i) => (
              <T.Small key={i} className={styles.uploadProgress}>
                <span>{p.file.name}</span>
                <ProgressBar uploadState={p} />
              </T.Small>
            ))}
          </div>
        </div>
      ) : (
        <DropInput />
      )}
      <Button
        disabled={showProgressScreen}
        loading={uploader.isUploading}
        onClick={presenter.onSubmit}
      >
        Submit
      </Button>
    </div>
  );
});

const preventDefault = (e: React.DragEvent<HTMLInputElement>) => {
  e.preventDefault();
  e.stopPropagation();
};
