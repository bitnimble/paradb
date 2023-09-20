import React from 'react';
import sanitizeHtml from 'sanitize-html';
import { Difficulty, PDMap } from 'schema/maps';
import { T } from 'ui/base/text/text';
import { difficultyColors, difficultyMap, parseDifficulty } from 'utils/difficulties';
import styles from './map_page.module.css';

const allowedTags: typeof sanitizeHtml.defaults.allowedTags = [
  ...sanitizeHtml.defaults.allowedTags,
];

const allowedAttributes: typeof sanitizeHtml.defaults.allowedAttributes = {
  '*': ['style'],
  'table': ['border', 'cellpadding', 'cellspacing'],
};

type Props = {
  map: PDMap;
  mapActions: React.ReactNode;
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

export const MapPage = (props: Props) => {
  const { map, mapActions } = props;

  const albumArtLink = props.map ? `/covers/${props.map.id}/${props.map.albumArt}` : undefined;

  return (
    <div className={styles.mapPage}>
      {albumArtLink && (
        <div className={styles.albumArt}>
          <img className={styles.albumArtImg} src={albumArtLink}></img>
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
                  __html: sanitizeHtml(breakNewlines(map.description), {
                    allowedTags,
                    allowedAttributes,
                  }),
                }}
              />
            </T.Small>
          </div>
        ) : undefined}
        {mapActions}
      </div>
    </div>
  );
};

function breakNewlines(content: string) {
  return content.replaceAll('\r', '').replaceAll('\n\n', '<br/>');
}
