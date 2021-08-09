import classNames from 'classnames';
import { T } from 'pages/paradb/base/text/text';
import { Button } from 'pages/paradb/base/ui/button/button';
import React from 'react';
import styles from './submit_map.css';

type SubmitMapPageProps = {
  filename: string | undefined,
  isSubmitting: boolean,
  onChangeData(file: File): void,
  onSubmit(): void,
};


export class SubmitMapPage extends React.Component<SubmitMapPageProps> {
  private readonly onFileChange = (target: HTMLInputElement) => {
    const file = target.files?.item(0);
    if (file) {
      this.props.onChangeData(file);
    }
  }

  private readonly onDrop = (e: React.DragEvent<HTMLInputElement>) => {
    const target = e.target;
    if (target instanceof HTMLInputElement) {
      this.onFileChange(target);
    }
  }

  private readonly onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.onFileChange(e.target);
  }

  render() {
    return (
      <div className={styles.submitMap}>
        <button className={classNames(styles.fileContainer, this.props.filename != null && styles.hasMapData)}>
          <input
            type="file"
            onDrop={this.onDrop}
            onChange={this.onChange}
          />
          <div className={styles.filename}>
            <T.Small>
              {this.props.filename
                  ? this.props.filename
                  : 'Click or drag to upload your zipped map.'
              }
            </T.Small>
          </div>
        </button>
        <br/>
        <Button loading={this.props.isSubmitting} onClick={this.props.onSubmit}>Submit</Button>
      </div>
    );
  }
}
