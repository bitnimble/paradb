import classNames from 'classnames';
import { Button } from 'pages/paradb/base/ui/button/button';
import React from 'react';
import styles from './submit_map.css';

type SubmitMapPageProps = {
  hasMapData: boolean,
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
        <input
          type="file"
          className={classNames(styles.fileontainer, this.props.hasMapData && styles.hasMapData)}
          onDrop={this.onDrop}
          onChange={this.onChange}
        />
        <br/>
        <Button loading={this.props.isSubmitting} onClick={this.props.onSubmit}>Submit</Button>
      </div>
    );
  }
}
