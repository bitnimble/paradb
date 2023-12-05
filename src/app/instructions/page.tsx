import { T } from 'ui/base/text/text';
import React from 'react';
import styles from './page.module.css';

export default function Instructions() {
  return (
    <div className={styles.instructions}>
      <div className={styles.section}>
        <T.Large weight="bold">PC instructions</T.Large>
        <T.Medium>
          <ol className={styles.instructionList}>
            <li>
              Download a map file from one of the map pages. This should save as a zip file, e.g.{' '}
              <T.Medium style="code">Hotel California.zip</T.Medium>
            </li>
            <li>
              Move the zip file from the downloaded location to{' '}
              <T.Medium style="code">Documents/Paradiddle/Songs/Hotel California.zip</T.Medium>.
            </li>
            <li>
              Unzip the zip file, creating a folder of the same name. For example, if the song was
              "Hotel California", the folder structure should end up looking as follows:
              <T.Medium style="code" display="block">
                {`Documents/
├─ Paradiddle/
│  ├─ Songs/
│  │  ├─ Hotel California/
│  │  │  ├─ Hotel California_Easy.rlrr
│  │  │  ├─ Hotel California_Medium.rlrr
│  │  │  ├─ Hotel California_Hard.rlrr
│  │  │  ├─ Hotel California_Expert.rlrr
│  │  │  ├─ drums_1.ogg
│  │  │  ├─ ...`}
              </T.Medium>
              Note: it is important that the folder name matches the song / rlrr filename --
              otherwise, the song will appear in the game but won't be playable.
            </li>
            <li>Delete the zip file, open up the game and enjoy your new map!</li>
          </ol>
        </T.Medium>
      </div>
      <div className={styles.section}>
        <T.Large weight="bold">Quest instructions</T.Large>
        <T.Medium>
          <ol className={styles.instructionList}>
            <li>
              Mount your Quest's file system into the device that you're using to download the maps.
            </li>
            <li>
              Download a map file from one of the map pages. This should save as a zip file, e.g.{' '}
              <T.Medium style="code">Hotel California.zip</T.Medium>
            </li>
            <li>
              Move the zip file from the downloaded location to{' '}
              <T.Medium style="code">
                Quest/Internal Shared Storage/Android/data/com.tanirganemre.paradiddle/Songs/Hotel
                California.zip
              </T.Medium>
              . You may need to create the "Songs" directory if it doesn't exist yet.
            </li>
            <li>
              Unzip the zip file, creating a folder of the same name. For example, if the song was
              "Hotel California", the folder structure should end up looking as follows:
              <T.Medium style="code" display="block">
                {`Quest/
├─ Internal Shared Storage/
│  ├─ Android/
│  |  ├─ data/
|  |  │  ├─ com.tanirganemre.paraddidle/
│  │  |  │  ├─ Songs/
│  │  │  │  │  ├─ Hotel California/
│  │  │  │  │  │  ├─ Hotel California_Easy.rlrr
│  │  │  │  │  │  ├─ Hotel California_Medium.rlrr
│  │  │  │  │  │  ├─ Hotel California_Hard.rlrr
│  │  │  │  │  │  ├─ Hotel California_Expert.rlrr
│  │  │  │  │  │  ├─ drums_1.ogg
│  │  │  │  │  │  ├─ ...`}
              </T.Medium>
              Note: it is important that the folder name matches the song / rlrr filename --
              otherwise, the song will appear in the game but won't be playable. Also, if you
              uninstall the Quest app, the "Songs" directory will be deleted, so you may want to
              back it up somewhere else before uninstalling the app if you want to keep your custom
              maps.
            </li>
            <li>Delete the zip file, open up the game and enjoy your new map!</li>
          </ol>
        </T.Medium>
      </div>
    </div>
  );
}
