import { T } from 'pages/paradb/base/text/text';
import React from 'react';
import styles from './instructions.css';

export class Instructions extends React.Component {
  render() {
    return (
      <div className={styles.instructions}>
        <div className={styles.section}>
          <T.Large weight="bold">PC instructions</T.Large>
          <p>
            <T.Medium>
              <ol className={styles.instructionList}>
                <li>Download a map file from one of the map pages. This should save as a zip file, e.g. <span className={styles.inlineCode}>Hotel California.zip</span></li>
                <li>Move the zip file from the downloaded location to <span className={styles.inlineCode}>{'<'}ParadiddleInstall{'>'}/Paradiddle/Saved/Songs/Hotel California.zip</span>.</li>
                <li>
                  Unzip the zip file, creating a folder of the same name. For example, if the song was "Hotel California", the folder structure should end up looking as follows:
                  <div className={styles.code}>{`ParadiddleInstall/
├─ Paradiddle/
│  ├─ Saved/
│  │  ├─ Songs/
│  │  │  ├─ Hotel California/
│  │  │  │  ├─ Hotel California_Easy.rlrr
│  │  │  │  ├─ Hotel California_Medium.rlrr
│  │  │  │  ├─ Hotel California_Hard.rlrr
│  │  │  │  ├─ Hotel California_Expert.rlrr
│  │  │  │  ├─ drums_1.ogg
│  │  │  │  ├─ ...`}</div>
                  Note: it is important that the folder name matches the song / rlrr filename -- otherwise, the song will appear in the game but won't be playable.
                </li>
                <li>Delete the zip file, open up the game and enjoy your new map!</li>
              </ol>
            </T.Medium>
          </p>
        </div>
        <div className={styles.section}>
          <T.Large weight="bold">Quest instructions</T.Large>
          <T.Medium>
            <ol className={styles.instructionList}>
              <li>Mount your Quest's file system into the device that you're using to download the maps.</li>
              <li>Download a map file from one of the map pages. This should save as a zip file, e.g. <span className={styles.inlineCode}>Hotel California.zip</span></li>
              <li>Move the zip file from the downloaded location to <span className={styles.inlineCode}>Quest/Internal Shared Storage/Paradiddle/Songs/Hotel California.zip</span>. You may need to create the "Paradiddle" and "Songs" directories if they don't exist yet.</li>
              <li>
                Unzip the zip file, creating a folder of the same name. For example, if the song was "Hotel California", the folder structure should end up looking as follows:
                <div className={styles.code}>{`Quest/
├─ Internal Shared Storage/
│  ├─ Paradiddle/
│  │  ├─ Songs/
│  │  │  ├─ Hotel California/
│  │  │  │  ├─ Hotel California_Easy.rlrr
│  │  │  │  ├─ Hotel California_Medium.rlrr
│  │  │  │  ├─ Hotel California_Hard.rlrr
│  │  │  │  ├─ Hotel California_Expert.rlrr
│  │  │  │  ├─ drums_1.ogg
│  │  │  │  ├─ ...`}</div>
                Note: it is important that the folder name matches the song / rlrr filename -- otherwise, the song will appear in the game but won't be playable.
              </li>
              <li>Delete the zip file, open up the game and enjoy your new map!</li>
            </ol>
          </T.Medium>
        </div>
      </div>
    )
  }
}
