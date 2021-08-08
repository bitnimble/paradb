import { T } from 'pages/paradb/base/text/text';
import { Button } from 'pages/paradb/base/ui/button/button';
import { Complexity, PDMap } from 'paradb-api-schema';
import React from 'react';
import styles from './map_page.css';

type Props = {
  map: PDMap | undefined;
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
    {props.complexities.map((c, i) => (
      <div key={i} className={styles.complexityPill}>
        <T.Small color="white">{c.complexityName || getComplexityNameDefault(c.complexity)}</T.Small>
      </div>
    ))}
  </div>
);

export class MapPage extends React.Component<Props> {
  private get albumArtLink() {
    return this.props.map
        ? `/static/map_data/${this.props.map.id}/${this.props.map.albumArt}`
        : undefined;
  }

  private get downloadLink() {
    return this.props.map
        ? `/static/map_data/${this.props.map.id}.zip`
        : undefined;
  }

  render() {
    const { map } = this.props;
    if (!map) {
      return <div className={styles.mapPage}>Loading...</div>;
    }
    return (
      <div className={styles.mapPage}>
        {this.albumArtLink && (
          <div className={styles.albumArt}>
            <img className={styles.albumArtImg} src={this.albumArtLink}></img>
          </div>
        )}
        <div className={styles.mapContent}>
          <T.Large style="title">{map.title}</T.Large>
          <br/>
          <T.Medium color="grey">{map.artist}{map.author != null ? <>| mapped by {map.author}</> : undefined}</T.Medium>
          <ComplexityPills complexities={map.complexities}/>
          {map.description != null ? (
            <div className={styles.description}>
              <T.Small color="grey">{map.description}</T.Small>
            </div>
          ) : undefined}
          {this.downloadLink && (
            <Button link={this.downloadLink}>Download</Button>
          )}
        </div>
      </div>
    );
  }
}
