import { action, computed, makeObservable, observable, runInAction } from 'mobx';
import { Api } from 'pages/paradb/base/api/api';
import { FormPresenter, FormStore } from 'pages/paradb/base/form/form_presenter';
import { Navigate } from 'pages/paradb/router/install';
import { RoutePath } from 'pages/paradb/router/routes';

export const zipTypes = ['application/zip', 'application/x-zip', 'application/x-zip-compressed'];

type UploadStateBase = { file: File };
type PendingUpload = UploadStateBase & { state: 'pending' };
type ActiveUpload = UploadStateBase & { state: 'uploading', progress: number };
type UploadSuccess = UploadStateBase & { state: 'success', id: string };
type UploadError = UploadStateBase & { state: 'error', errorMessage: string };

export type UploadState = PendingUpload | ActiveUpload | UploadSuccess | UploadError;

const MAX_CONNECTIONS = 4;
export class ThrottledMapUploader {
  @observable.deep
  private uploads: UploadState[] = [];

  constructor(private readonly api: Api) {
    makeObservable(this);
  }

  @computed
  get isUploading() {
    return this.uploads.some(s => s.state === 'uploading');
  }

  @computed
  get hasErrors() {
    return this.uploads.some(u => u.state === 'error');
  }

  @computed
  get uploadProgress() {
    return this
      .uploads
      .slice()
      .sort((a, b) => a.file.name.localeCompare(b.file.name));
  }

  private getNextInQueue(): UploadState | undefined {
    const entry = this.uploads.find(u => u.state === 'pending');
    if (!entry) {
      return;
    }
    return entry;
  }

  private async processQueue(reuploadMapId?: string) {
    const pendingUpload = this.getNextInQueue();
    if (!pendingUpload) {
      return;
    }
    runInAction(() => {
      pendingUpload.state = 'uploading';
    });
    // Force the type to be state: 'uploading' + progress
    const upload: { file: File, state: 'uploading', progress: number } = pendingUpload as any;
    const onProgress = action((e: ProgressEvent) => {
      upload.progress = e.loaded / e.total;
    });
    const onUploadFinish = action(() => {
      upload.progress = 1;
    });
    const mapData = new Uint8Array(await upload.file.arrayBuffer());
    try {
      const resp = await this.api.submitMap(
        { id: reuploadMapId, mapData },
        onProgress,
        onUploadFinish,
      );
      runInAction(() => {
        if (resp.success) {
          // TODO: fix type safety here
          (upload as any).state = 'success';
          (upload as any).id = resp.id;
        } else {
          (upload as any).state = 'error';
          (upload as any).errorMessage = resp.errorMessage;
        }
      });
    } catch (e) {
      runInAction(() => {
        (upload as any).state = 'error';
        (upload as any).errorMessage = 'Unknown error';
        console.error(JSON.stringify(e));
      });
    }
  }

  async start(reuploadMapId?: string) {
    if (reuploadMapId != null && this.uploads.length > 1) {
      throw new Error(
        'A reupload map ID was specified, but more than one file was selected to be uploaded.',
      );
    }
    // Kick off initial uploads
    Array(MAX_CONNECTIONS).fill(0).map((_, i) => this.processQueue(reuploadMapId));
    return new Promise<[string[], string[]]>(res => {
      const intervalHandler = setInterval(() => {
        // Work on the next queue item
        if (!this.uploads.some(u => u.state === 'pending' || u.state === 'uploading')) {
          clearInterval(intervalHandler);
          res([
            this.uploads.filter((u): u is UploadSuccess => u.state === 'success').map(u => u.id),
            this.uploads.filter((u): u is UploadError => u.state === 'error').map(u =>
              u.errorMessage
            ),
          ]);
        } else if (
          this.uploads.some(u => u.state === 'pending')
          && this.uploads.filter(u => u.state === 'uploading').length < MAX_CONNECTIONS
        ) {
          this.processQueue();
        }
      }, 500);
    });
  }

  @action.bound
  addFiles(files: UploadState[]) {
    files.forEach(f => {
      this.uploads.push(f);
    });
  }

  @action.bound
  reset() {
    this.uploads = [];
  }
}

export type SubmitMapField = 'files';
export class SubmitMapStore extends FormStore<SubmitMapField> {
  id?: string;
  files = new Map<string, UploadState>();

  get filenames() {
    return [...this.files.values()].map(f => f.file.name).sort((a, b) => a.localeCompare(b));
  }

  constructor(id?: string) {
    super();
    this.id = id;
    makeObservable(this, { files: observable.shallow, filenames: computed, reset: action.bound });
  }

  reset() {
    this.files = new Map();
  }
}

export class SubmitMapPresenter extends FormPresenter<SubmitMapField> {
  constructor(
    private readonly uploader: ThrottledMapUploader,
    private readonly navigate: Navigate,
    private readonly store: SubmitMapStore,
  ) {
    super(store);
    makeObservable(this, { onChangeData: action.bound });
  }

  onChangeData(files: FileList) {
    runInAction(() => this.store.errors.clear());
    if (this.store.id != null && files.length > 1) {
      this.pushErrors(['files'], 'When reuploading a map, you can only select a single file.');
      return;
    }
    for (const file of files) {
      let f: UploadState;
      if (!zipTypes.includes(file.type)) {
        f = { state: 'error', file, errorMessage: 'File is not a zip' };
      } else if (file.size > 1024 * 1024 * 40) { // 40MiB. We use MiB because that's what Windows displays in Explorer and therefore what users will expect.
        f = { state: 'error', file, errorMessage: 'File is over 40MB' };
      } else {
        f = { state: 'pending', file };
      }
      // Deduplicate by both filename and byte size
      const key = `${file.name}-${file.size}`;
      this.store.files.set(key, f);
    }
  }

  submit = async () => {
    this.uploader.addFiles([...this.store.files.values()]);
    this.store.reset();
    const [ids, errors] = await this.uploader.start(this.store.id);

    if (errors.length !== 0) {
      // TODO: show errors
    } else if (ids.length === 1) {
      this.navigate([RoutePath.MAP, ids[0]], true);
    } else {
      this.navigate([RoutePath.MAP_LIST], true);
    }
  };
}
