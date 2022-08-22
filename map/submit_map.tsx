import classNames from 'classnames';
import { action, makeObservable, observable } from 'mobx';
import { observer } from 'mobx-react';
import { T } from 'pages/paradb/base/text/text';
import { Button } from 'pages/paradb/base/ui/button/button';
import { UploadState, zipTypes } from 'pages/paradb/map/submit_map_presenter';
import React from 'react';
import styles from './submit_map.css';

type SubmitMapPageProps = {
  filenames: string[],
  uploadProgress: UploadState[],
  isUploading: boolean,
  showProgressScreen: boolean,
  onChangeData(files: FileList): void,
  onSubmit(): void,
};

@observer
export class SubmitMapPage extends React.Component<SubmitMapPageProps> {
  @observable.ref
  private draggingOver = false;

  constructor(props: SubmitMapPageProps) {
    super(props);
    makeObservable<SubmitMapPage, 'draggingOver'>(this, { draggingOver: observable });
  }

  private readonly onFileChange = (files: FileList | null) => {
    if (files && files.length) {
      this.props.onChangeData(files);
    }
  };

  private readonly onDrop = action((e: React.DragEvent<HTMLInputElement>) => {
    preventDefault(e);
    this.draggingOver = false;
    this.onFileChange(e.dataTransfer.files);
  });

  private readonly onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.onFileChange(e.target.files);
  };

  private readonly onDragEnter = action((e: React.DragEvent<HTMLInputElement>) => {
    preventDefault(e);
    this.draggingOver = true;
  });

  private readonly onDragLeave = action((e: React.DragEvent<HTMLInputElement>) => {
    preventDefault(e);
    this.draggingOver = false;
  });

  private renderDropInput() {
    const { filenames } = this.props;

    return (
      <button
        className={classNames(
          styles.fileContainer,
          (filenames.length || this.draggingOver) && styles.hasMapData,
        )}
      >
        <input
          type="file"
          accept={['zip', ...zipTypes].join(',')}
          multiple={true}
          onChange={this.onChange}
          onDrop={this.onDrop}
          onDragOver={preventDefault}
          onDragEnter={this.onDragEnter}
          onDragLeave={this.onDragLeave}
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
  }

  private renderProgressBar(uploadState: UploadState) {
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
    }
    return (
      <div className={classNames(styles.progressContainer, styles.progressBar)}>
        <div
          className={classNames(styles.progressInner)}
          style={{ width: `${uploadState.progress * 100}%` }}
        >
        </div>
      </div>
    );
  }

  render() {
    const { uploadProgress, isUploading, showProgressScreen, onSubmit } = this.props;
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
        <br/>
        {showProgressScreen
          ? (
            <div className={classNames(styles.fileContainer, styles.hasMapData)}>
              <div className={styles.filenames}>
                {uploadProgress.map((p, i) => (
                  <T.Small
                    key={i}
                    className={styles.uploadProgress}
                  >
                    <span>
                      {p
                        .file
                        .name}
                    </span>
                    {this.renderProgressBar(p)}
                  </T.Small>
                ))}
              </div>
            </div>
          )
          : this.renderDropInput()}
        <br/>
        <Button disabled={showProgressScreen} loading={isUploading} onClick={onSubmit}>
          Submit
        </Button>
      </div>
    );
  }
}

const preventDefault = (e: React.DragEvent<HTMLInputElement>) => {
  e.preventDefault();
  e.stopPropagation();
};
