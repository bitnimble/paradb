import React from 'react';
import sanitizeHtml from 'sanitize-html';
import { Difficulty, PDMap } from 'schema/maps';
import { T } from 'ui/base/text/text';
import { difficultyColors, difficultyMap, parseDifficulty } from 'utils/difficulties';
import styles from './map_page.module.css';
import Image from 'next/image';

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

export function getAlbumArtUrl(map: PDMap) {
  return `/covers/${map.id}/${map.albumArt}`;
}

export function getMapDescription(description: string) {
  return sanitizeHtml(breakNewlines(description), {
    allowedTags,
    allowedAttributes,
  });
}

export const MapPage = (props: Props) => {
  const { map, mapActions } = props;

  return (
    <div className={styles.mapPage}>
      <div className={styles.albumArt}>
        <Image
          unoptimized={true}
          fill={true}
          className={styles.albumArtImg}
          src={getAlbumArtUrl(map)}
          alt={`Album art for ${map.title}`}
        ></Image>
      </div>
      <div className={styles.mapContent}>
        <T.ExtraLarge display="block" style="title">
          {map.title}
        </T.ExtraLarge>
        <T.Large display="block" color="grey">
          {map.artist}
        </T.Large>
        <div>
          <T.Small display="block" color="grey">
            {map.author != null ? `Mapped by ${map.author}` : undefined}
          </T.Small>
          <T.Small display="block" color="grey">
            Submitted {new Date(map.submissionDate).toDateString()}
          </T.Small>
        </div>

        <DifficultyPills difficulties={map.difficulties} />
        {mapActions}
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
                  __html: getMapDescription(map.description),
                }}
              />
            </T.Small>
          </div>
        ) : undefined}
      </div>
    </div>
  );
};

function breakNewlines(content: string) {
  return content.replaceAll('\r', '').replaceAll('\n\n', '<br/>');
}
