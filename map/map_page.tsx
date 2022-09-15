import { T } from 'pages/paradb/base/text/text';
import { Button } from 'pages/paradb/base/ui/button/button';
import { getMapFileLink } from 'pages/paradb/utils/maps';
import { Difficulty, PDMap } from 'paradb-api-schema';
import React from 'react';
import styles from './map_page.css';

type Props = {
  map: PDMap | undefined,
  canDelete: boolean,
  isFavorited: boolean | undefined,
  deleteMap(): void,
  toggleFavorite(): void,
};

export function getDifficultyColor(difficultyName: string | undefined) {
  if (difficultyName == null) {
    return 'black';
  }
  switch (difficultyName.toLowerCase()) {
    case 'easy':
      return 'green';
    case 'medium':
      return 'yellow';
    case 'hard':
      return 'orange';
    case 'expert':
      return 'red';
    default:
      // Custom difficulty name -- we don't know the difficulty level.
      // TODO: could do some difficulty name parsing to see if it has easy / medium / hard in the name.
      return 'black';
  }
}

const DifficultyPills = (props: { difficulties: Difficulty[] }) => (
  <div className={styles.difficulties}>
    {props
      .difficulties
      .map((d, i) => (
        <div
          key={i}
          className={styles.difficultyPill}
          style={{ backgroundColor: getDifficultyColor(d.difficultyName) }}
        >
          <T.Small color="white">{d.difficultyName || 'Unknown'}</T.Small>
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
    return this.props.map ? getMapFileLink(this.props.map.id) : undefined;
  }

  render() {
    const { map, canDelete, isFavorited, deleteMap, toggleFavorite } = this.props;
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
          <T.ExtraLarge display="block" style="title">{map.title}</T.ExtraLarge>
          <T.Large display="block" color="grey">{map.artist}</T.Large>
          <br/>
          <T.Small display="block" color="grey">
            {map.author != null ? `Mapped by ${map.author}` : undefined}
          </T.Small>
          <T.Small display="block" color="grey">
            Submitted {new Date(map.submissionDate).toDateString()}
          </T.Small>

          <DifficultyPills difficulties={map.difficulties}/>
          {map.description != null
            ? (
              <div className={styles.description}>
                <T.Small color="grey">{map.description}</T.Small>
              </div>
            )
            : undefined}
          <div className={styles.actions}>
            {isFavorited != null && (
              <Button
                onClick={toggleFavorite}
                style={isFavorited ? 'active' : 'regular'}
              >
                ❤
              </Button>
            )}
            {this
              .downloadLink && <Button link={this.downloadLink}>Download</Button>}
            {canDelete && <Button style="error" onClick={deleteMap}>Delete</Button>}
          </div>
        </div>
      </div>
    );
  }
}
