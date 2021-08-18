import classNames from 'classnames';
import { action, observable } from 'mobx';
import { observer } from 'mobx-react';
import { T } from 'pages/paradb/base/text/text';
import { Button } from 'pages/paradb/base/ui/button/button';
import React from 'react';
import styles from './submit_map.css';

type SubmitMapPageProps = {
  filenames: string[],
  isSubmitting: boolean,
  onChangeData(files: FileList): void,
  onSubmit(): void,
};

@observer
export class SubmitMapPage extends React.Component<SubmitMapPageProps> {
  @observable.ref
  private draggingOver = false;

  private readonly onFileChange = (files: FileList | null) => {
    if (files && files.length) {
      this.props.onChangeData(files);
    }
  }

  private readonly onDrop = action((e: React.DragEvent<HTMLInputElement>) => {
    preventDefault(e);
    this.draggingOver = false;
    this.onFileChange(e.dataTransfer.files);
  });

  private readonly onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.onFileChange(e.target.files);
  }

  private readonly onDragEnter = action((e: React.DragEvent<HTMLInputElement>) => {
    preventDefault(e);
    this.draggingOver = true;
  });

  private readonly onDragLeave = action((e: React.DragEvent<HTMLInputElement>) => {
    preventDefault(e);
    this.draggingOver = false;
  });

  render() {
    const { filenames, isSubmitting, onSubmit } = this.props;
    return (
      <div className={styles.submitMap}>
        <button className={classNames(styles.fileContainer, (filenames.length || this.draggingOver) && styles.hasMapData)}>
          <input
            type="file"
            accept="zip,application/zip,application/x-zip,application/x-zip-compressed"
            multiple={true}
            onChange={this.onChange}
            onDrop={this.onDrop}
            onDragOver={preventDefault}
            onDragEnter={this.onDragEnter}
            onDragLeave={this.onDragLeave}
          />
          <div className={styles.filename}>
            <T.Small>
              {filenames.length
                  ? filenames.map((f, i)=> (
                    <p key={i}>{f}</p>
                  ))
                  : 'Click or drag to upload your zipped map.'
              }
            </T.Small>
          </div>
        </button>
        <br/>
        <Button loading={isSubmitting} onClick={onSubmit}>Submit</Button>
      </div>
    );
  }
}

const preventDefault = (e: React.DragEvent<HTMLInputElement>) => {
  e.preventDefault();
  e.stopPropagation();
}
