import { T } from 'pages/paradb/base/text/text';
import { Complexity, PDMap } from 'pages/paradb/map/map_schema';
import React from 'react';
import styles from './map_page.css';

type Props = {
  map?: PDMap;
}

function getComplexityNameDefault(complexity: number) {
  switch (complexity) {
    case 1: return 'Easy';
    case 2: return 'Medium';
    case 3: return 'Hard';
    case 4: return 'Expert';
    case 5: return 'Expert+';
    default: throw new Error(`Did not expect complexity level ${complexity}`);
  }
}

const ComplexityPills = (props: { complexities: Complexity[] }) => (
  <div className={styles.complexities}>
    {props.complexities.map(c => (
      <div className={styles.complexityPill}>
        <T.Small color="white">{c.complexityName || getComplexityNameDefault(c.complexity)}</T.Small>
      </div>
    ))}
  </div>
);

const DownloadButton = (props: { to: string }) => (
  <a href={props.to} referrerPolicy="no-referrer" target="_blank">
    <div className={styles.downloadButton}>
      <T.Medium>Download</T.Medium>
    </div>
  </a>

);

export class MapPage extends React.Component<Props> {
  render() {
    const { map } = this.props;
    if (!map) {
      return <div className={styles.mapPage}>Loading...</div>;
    }
    return (
      <div key={map.id} className={styles.mapPage}>
        {map.albumArt && (
          <div className={styles.albumArt}>
            <img src={map.albumArt}></img>
          </div>
        )}
        <div className={styles.mapContent}>
          <T.Large style="title">{map.title}</T.Large>
          <br/>
          <T.Medium color="grey">{map.artist} | mapped by {map.author}</T.Medium>
          <ComplexityPills complexities={map.complexities}/>
          {map.description != null ? (
            <div className={styles.description}>
              <T.Small color="grey">{map.description}</T.Small>
            </div>
          ) : undefined}
          <DownloadButton to={map.downloadLink}/>
        </div>
      </div>
    )
  }
}
