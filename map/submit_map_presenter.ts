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

  private async processQueue() {
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
    const mapData = new Uint8Array(await upload.file.arrayBuffer());
    try {
      const resp = await this.api.submitMap({ mapData }, onProgress);
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

  async start() {
    // Kick off initial uploads
    Array(MAX_CONNECTIONS).fill(0).map((_, i) => this.processQueue());
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
  addFile(file: File) {
    this.uploads.push({ state: 'pending', file });
  }

  @action.bound
  addFiles(files: File[]) {
    files.forEach(f => this.addFile(f));
  }

  @action.bound
  reset() {
    this.uploads = [];
  }
}

export type FileState = { file: File, error?: string };
export type SubmitMapField = 'files';
export class SubmitMapStore extends FormStore<SubmitMapField> {
  files = new Map<string, FileState>();

  get filenames() {
    return [...this.files.values()].map(f => f.file.name).sort((a, b) => a.localeCompare(b));
  }

  constructor() {
    super();
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
    for (const file of files) {
      const fileState: FileState = { file };
      if (!zipTypes.includes(file.type)) {
        fileState.error = 'File is not a zip';
        this.pushErrors(['files'], `${file.name} was not a zip file`);
      }
      // Deduplicate by both filename and byte size
      const key = `${file.name}-${file.size}`;
      this.store.files.set(key, fileState);
    }
  }

  submit = async () => {
    runInAction(() => this.store.errors.clear());
    const fieldValues = { files: this.store.files };
    this.checkRequiredFields(['files', fieldValues.files]);
    if (this.store.hasErrors) {
      return;
    }
    this.uploader.addFiles([...fieldValues.files.values()].map(s => s.file));
    this.store.reset();
    const [ids, errors] = await this.uploader.start();

    if (errors.length !== 0) {
      // TODO: show errors
    } else if (ids.length === 1) {
      this.navigate([RoutePath.MAP, ids[0]], true);
    } else {
      this.navigate([RoutePath.MAP_LIST], true);
    }
  };
}
