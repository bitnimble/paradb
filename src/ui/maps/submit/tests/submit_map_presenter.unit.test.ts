import { autorun } from 'mobx';
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { buildMapZip } from 'services/maps/tests/map_generator';
import {
  SubmitMapPresenter,
  SubmitMapStore,
  ThrottledMapUploader,
  UploadState,
} from 'ui/maps/submit/submit_map_presenter';

const zipFile = (name: string, opts: { lengthSeconds: number; padBytes: number }) =>
  new File(
    [
      buildMapZip({
        folder: 'Test',
        title: 'Test',
        artist: 'Artist',
        difficulties: [{ name: 'Easy', lengthSeconds: opts.lengthSeconds }],
        padBytes: opts.padBytes,
      }),
    ],
    name,
    { type: 'application/zip' }
  );

const fileListOf = (...files: File[]) => files as unknown as FileList;

const presenterFor = (store: SubmitMapStore) => {
  const uploader = new ThrottledMapUploader({} as never);
  const added: UploadState[] = [];
  uploader.addFiles = (files: UploadState[]) => added.push(...files);
  const presenter = new SubmitMapPresenter(uploader, store, {} as AppRouterInstance);
  return { presenter, added };
};

// The presenter reads the archive asynchronously; `checksInFlight` dropping back to 0 is the signal
// that every check has landed.
const settled = (store: SubmitMapStore) =>
  new Promise<void>((resolve) => {
    const dispose = autorun(() => {
      if (store.checksInFlight === 0) {
        dispose();
        resolve();
      }
    });
  });

const stateOf = (store: SubmitMapStore, name: string) =>
  store.selectedFiles.find((f) => f.file.name === name);

describe('SubmitMapPresenter song length check', () => {
  it('rejects a file whose archive is over the budget for its song', async () => {
    const store = new SubmitMapStore();
    const { presenter } = presenterFor(store);
    const file = zipFile('over.zip', { lengthSeconds: 60, padBytes: 90 * 1024 * 1024 });

    presenter.onChangeData(fileListOf(file));
    await settled(store);

    const upload = stateOf(store, 'over.zip');
    expect(upload?.state).toEqual('error');
    expect(upload?.state === 'error' && upload.errorMessage).toContain('limit for a song');
  });

  it('leaves a file inside its budget alone', async () => {
    const store = new SubmitMapStore();
    const { presenter } = presenterFor(store);

    presenter.onChangeData(
      fileListOf(zipFile('under.zip', { lengthSeconds: 60, padBytes: 40 * 1024 * 1024 }))
    );
    await settled(store);

    expect(stateOf(store, 'under.zip')?.state).toEqual('pending');
  });

  // Otherwise the view never re-renders: `files` is deep observable, so the entry the store holds is
  // a different object to the one that went in.
  it('marks the error on the entry the view is observing', async () => {
    const store = new SubmitMapStore();
    const { presenter } = presenterFor(store);
    const observed: (string | undefined)[] = [];
    const dispose = autorun(() => observed.push(store.selectedFiles.map((f) => f.state).join(',')));

    presenter.onChangeData(
      fileListOf(zipFile('over.zip', { lengthSeconds: 60, padBytes: 90 * 1024 * 1024 }))
    );
    await settled(store);
    dispose();

    expect(observed).toContain('error');
  });

  it('does not hand rejected files to the uploader', async () => {
    const store = new SubmitMapStore();
    const { presenter, added } = presenterFor(store);

    presenter.onChangeData(
      fileListOf(
        zipFile('over.zip', { lengthSeconds: 60, padBytes: 90 * 1024 * 1024 }),
        zipFile('under.zip', { lengthSeconds: 60, padBytes: 40 * 1024 * 1024 })
      )
    );
    await settled(store);
    void presenter.onSubmit();

    expect(added.map((f) => f.file.name)).toEqual(['under.zip']);
  });

  // The dedupe key is name plus size, so a different file can take the same slot while its
  // predecessor's check is still running.
  it('does not apply a check to the file that replaced the one it was reading', async () => {
    const store = new SubmitMapStore();
    const { presenter } = presenterFor(store);
    const short = zipFile('map.zip', { lengthSeconds: 60, padBytes: 90 * 1024 * 1024 });
    const long = new File(
      [
        buildMapZip({
          folder: 'Test',
          title: 'Test',
          artist: 'Artist',
          difficulties: [{ name: 'Easy', lengthSeconds: 600 }],
          // One byte less filler, to offset the extra digit in the declared length.
          padBytes: 90 * 1024 * 1024 - 1,
        }),
      ],
      'map.zip',
      { type: 'application/zip' }
    );
    // Same name and size, so both take the same slot in the store.
    expect(`${short.name}-${short.size}`).toEqual(`${long.name}-${long.size}`);

    presenter.onChangeData(fileListOf(short));
    presenter.onChangeData(fileListOf(long));
    await settled(store);

    // The long song's archive fits its own budget, so the surviving entry must not be errored.
    expect(stateOf(store, 'map.zip')?.state).toEqual('pending');
  });
});
