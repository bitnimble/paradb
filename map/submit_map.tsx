import classNames from 'classnames';
import { action, makeObservable, observable } from 'mobx';
import { observer } from 'mobx-react';
import { T } from 'pages/paradb/base/text/text';
import { Button } from 'pages/paradb/base/ui/button/button';
import { zipTypes } from 'pages/paradb/map/submit_map_presenter';
import React from 'react';
import styles from './submit_map.css';

type SubmitMapPageProps = {
  filenames: string[],
  uploadProgress: ({ name: string, progress: number | undefined })[],
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

  private renderProgressBar(progress: number | undefined) {
    if (progress == null) {
      return <div className={styles.progressContainer}>Pending</div>;
    } else if (progress === 1) {
      return <div className={styles.progressContainer}>Done</div>;
    } else if (progress === -1) {
      return <div className={styles.progressContainer}>Error</div>;
    }
    return (
      <div className={classNames(styles.progressContainer, styles.progressBar)}>
        <div
          className={classNames(styles.progressInner, progress === -1 && styles.progressError)}
          style={{ width: `${progress * 100}%` }}
        >
        </div>
      </div>
    );
  }

  render() {
    const { uploadProgress, isUploading, showProgressScreen, onSubmit } = this.props;
    return (
      <div className={styles.submitMap}>
        {showProgressScreen
          ? (
            <div className={classNames(styles.fileContainer, styles.hasMapData)}>
              <div className={styles.filenames}>
                {uploadProgress.map((p, i) => (
                  <T.Small
                    key={i}
                    className={styles.uploadProgress}
                  >
                    <span>{p.name}</span>
                    {this
                      .renderProgressBar(
                        p.progress,
                      )}
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
