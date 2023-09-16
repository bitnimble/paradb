import { T } from 'ui/base/text/text';
import { Button } from 'ui/base/button/button';
import { getMapFileLink } from 'utils/maps';
import React from 'react';
import sanitizeHtml from 'sanitize-html';
import styles from './map_page.module.css';
import { difficultyMap, parseDifficulty, difficultyColors } from 'utils/difficulties';
import { Difficulty, PDMap } from 'schema/maps';
import { observer } from 'mobx-react';

const allowedTags: typeof sanitizeHtml.defaults.allowedTags = [
  ...sanitizeHtml.defaults.allowedTags,
];

const allowedAttributes: typeof sanitizeHtml.defaults.allowedAttributes = {
  '*': ['style'],
  'table': ['border', 'cellpadding', 'cellspacing'],
};

type Props = {
  map: PDMap | undefined;
  canModify: boolean;
  isFavorited: boolean | undefined;
  ReuploadDialog?: React.ComponentType;
  showReuploadDialog(): void;
  deleteMap(): void;
  toggleFavorite(): void;
};

export const sortDifficulty = (a: Difficulty, b: Difficulty) => {
  return (
    difficultyMap[parseDifficulty(a.difficultyName)] -
    difficultyMap[parseDifficulty(b.difficultyName)]
  );
};

const DifficultyPills = (props: { difficulties: Difficulty[] }) => (
  <div className={styles.difficulties}>
    {props.difficulties.sort(sortDifficulty).map((d, i) => (
      <div
        key={i}
        className={styles.difficultyPill}
        style={{ backgroundColor: difficultyColors[parseDifficulty(d.difficultyName)] }}
      >
        <T.Small color="white">{d.difficultyName || 'Unknown'}</T.Small>
      </div>
    ))}
  </div>
);

@observer
export class MapPage extends React.Component<Props> {
  private get albumArtLink() {
    return this.props.map ? `/covers/${this.props.map.id}/${this.props.map.albumArt}` : undefined;
  }

  private get downloadLink() {
    return this.props.map ? getMapFileLink(this.props.map.id) : undefined;
  }

  private breakNewlines(content: string) {
    return content.replaceAll('\r', '').replaceAll('\n\n', '<br/>');
  }

  render() {
    const {
      map,
      canModify,
      isFavorited,
      ReuploadDialog,
      showReuploadDialog,
      deleteMap,
      toggleFavorite,
    } = this.props;
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
          <T.ExtraLarge display="block" style="title">
            {map.title}
          </T.ExtraLarge>
          <T.Large display="block" color="grey">
            {map.artist}
          </T.Large>
          <br />
          <T.Small display="block" color="grey">
            {map.author != null ? `Mapped by ${map.author}` : undefined}
          </T.Small>
          <T.Small display="block" color="grey">
            Submitted {new Date(map.submissionDate).toDateString()}
          </T.Small>

          <DifficultyPills difficulties={map.difficulties} />
          {map.description != null ? (
            <div className={styles.description}>
              <T.Small
                color="grey"
                ComponentOverride={({ className, children }) => (
                  <div className={className}>{children}</div>
                )}
              >
                <div
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(this.breakNewlines(map.description), {
                      allowedTags,
                      allowedAttributes,
                    }),
                  }}
                />
              </T.Small>
            </div>
          ) : undefined}
          <div className={styles.actions}>
            {isFavorited != null && (
              <Button onClick={toggleFavorite} style={isFavorited ? 'active' : 'regular'}>
                ❤
              </Button>
            )}
            {this.downloadLink && <Button link={this.downloadLink}>Download</Button>}
            {canModify && (
              <>
                <Button onClick={showReuploadDialog}>Reupload</Button>
                <Button style="error" onClick={deleteMap}>
                  Delete
                </Button>
              </>
            )}
            {ReuploadDialog && <ReuploadDialog />}
          </div>
        </div>
      </div>
    );
  }
}
