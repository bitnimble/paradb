import { observer } from 'mobx-react';
import { T } from 'pages/paradb/base/text/text';
import { Button } from 'pages/paradb/base/ui/button/button';
import { Numeric } from 'pages/paradb/base/ui/numeric/create';
import { Textbox } from 'pages/paradb/base/ui/textbox/create';
import {
  complexityNameKey,
  complexityNumericKey,
  SubmitMapField,
} from 'pages/paradb/map/submit_map_presenter';
import { Complexity } from 'paradb-api-schema';
import React from 'react';
import styles from './submit_map.css';

type ComplexitiesListProps = {
  complexities: Complexity[],
  errors: Map<SubmitMapField, string>;
  onComplexityAdd(): void,
  onComplexityRemove(i: number): void,
};

type SubmitMapPageProps = {
  title: string,
  artist: string,
  author: string,
  albumArt: string,
  description: string,
  downloadLink: string,
  errors: Map<SubmitMapField, string>;
  onChangeTitle(value: string): void,
  onChangeArtist(value: string): void,
  onChangeAuthor(value: string): void,
  onChangeAlbumArt(value: string): void,
  onChangeDescription(value: string): void,
  onChangeDownloadLink(value: string): void,
  onSubmit(): void,
  ComplexitiesList: React.ComponentType,
};

export const ComplexitiesList = observer((props: ComplexitiesListProps) => (
  <>
    <T.Small color="grey">Difficulties</T.Small>
    <div className={styles.complexitiesList}>
      {props.complexities.map((c, i) => {
        // TODO: refactor out this lambda on render
        const onNumericChange = (value: number) => c.complexity = value;
        const onNameChange = (value: string) => c.complexityName = value;
        const removeComplexity = () => props.onComplexityRemove(i);
        const numericError = props.errors.get(complexityNumericKey(i));
        const nameError = props.errors.get(complexityNameKey(i));

        return (
          <div className={styles.complexity} key={i}>
            <Numeric value={c.complexity} onChange={onNumericChange} min={1} max={4} required={true} label="Difficulty" error={numericError}/>
            <Textbox value={c.complexityName || ''} onChange={onNameChange} required={true} label="Name" error={nameError}/>
            <Button className={styles.removeComplexityButton} onClick={removeComplexity} disabled={props.complexities.length === 1}>✖</Button>
          </div>
        );
      })}
      <br/>
      <Button onClick={props.onComplexityAdd}>Add complexity</Button>
    </div>
  </>
));

export const SubmitMapPage = observer((props: SubmitMapPageProps) => (
  <div className={styles.submitMap}>
    <div className={styles.fields}>
      <Textbox value={props.title} onChange={props.onChangeTitle} className={styles.title} required={true} label="Title" error={props.errors.get('title')}/>
      <Textbox value={props.artist} onChange={props.onChangeArtist} className={styles.artist} required={true}  label="Artist" error={props.errors.get('artist')}/>
      <Textbox value={props.author} onChange={props.onChangeAuthor} className={styles.author} label="Author" error={props.errors.get('author')}/>
      <Textbox value={props.albumArt} onChange={props.onChangeAlbumArt} className={styles.albumArt} label="Link to album art" error={props.errors.get('albumArt')}/>
      <Textbox value={props.downloadLink} onChange={props.onChangeDownloadLink} className={styles.downloadLink} required={true} label="Download link" error={props.errors.get('downloadLink')}/>
      <div className={styles.descriptionContainer}>
        <Textbox value={props.description} onChange={props.onChangeDescription} className={styles.description} label="Description" inputType="area" error={props.errors.get('description')}/>
        <props.ComplexitiesList/>
      </div>
    </div>
    <br/>
    <Button onClick={props.onSubmit}>Submit</Button>
  </div>
));
