import { Api } from 'app/api/api';
import { reportUploadComplete } from 'app/api/maps/submit/complete/actions';
import { action, computed, observable, runInAction } from 'mobx';
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { FormPresenter, FormStore } from 'ui/base/form/form_presenter';
import { RoutePath, routeFor } from 'utils/routes';

export const zipTypes = ['application/zip', 'application/x-zip', 'application/x-zip-compressed'];

type UploadStateBase = { file: File };
type PendingUpload = UploadStateBase & { state: 'pending' };
type ActiveUpload = UploadStateBase & { state: 'uploading'; progress: number };
type ProcessingUpload = UploadStateBase & { state: 'processing' };
type UploadSuccess = UploadStateBase & { state: 'success'; id: string };
type UploadError = UploadStateBase & { state: 'error'; errorMessage: string };

export type UploadState =
  | PendingUpload
  | ActiveUpload
  | ProcessingUpload
  | UploadSuccess
  | UploadError;

const MAX_CONNECTIONS = 2;
export class ThrottledMapUploader {
  @observable accessor uploads: UploadState[] = [];

  constructor(private readonly api: Api) {}

  @computed get isUploading() {
    return this.uploads.some((s) => s.state === 'uploading' || s.state === 'processing');
  }

  @computed get hasErrors() {
    return this.uploads.some((u) => u.state === 'error');
  }

  @computed get uploadProgress() {
    return this.uploads.slice().sort((a, b) => a.file.name.localeCompare(b.file.name));
  }

  private getNextInQueue(): UploadState | undefined {
    const entry = this.uploads.find((u) => u.state === 'pending');
    if (!entry) {
      return;
    }
    return entry;
  }

  private async processQueue(reuploadMapId?: string) {
    const upload = this.getNextInQueue();
    if (!upload) {
      return;
    }
    runInAction(() => {
      upload.state = 'uploading';
    });
    const mapData = new Uint8Array(await upload.file.arrayBuffer());
    try {
      // Get map ID and presigned S3 upload URL
      const submitMapResp = await this.api.submitMap({
        id: reuploadMapId,
        title: upload.file.name,
      });
      if (!submitMapResp.success) {
        runInAction(() => {
          upload.state = 'error';
          (upload as UploadError).errorMessage = submitMapResp.errorMessage;
        });
        return;
      }

      // Upload to S3
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = action((e: ProgressEvent) => {
        (upload as ActiveUpload).progress = e.loaded / e.total;
      });
      xhr.upload.onload = action(async () => {
        upload.state = 'processing';
        const processMapResp = await reportUploadComplete(submitMapResp.id, !!reuploadMapId);
        runInAction(() => {
          if (!processMapResp.success) {
            upload.state = 'error';
            (upload as UploadError).errorMessage = processMapResp.errorMessage;
          } else {
            upload.state = 'success';
            (upload as UploadSuccess).id = submitMapResp.id;
          }
        });
      });
      xhr.open('PUT', submitMapResp.url);
      xhr.setRequestHeader('Content-Type', 'application/zip');
      xhr.send(mapData);
    } catch (e) {
      runInAction(() => {
        upload.state = 'error';
        (upload as UploadError).errorMessage = 'Unknown error';
        console.error(JSON.stringify(e));
      });
    }
  }

  async start(reuploadMapId?: string) {
    if (reuploadMapId != null && this.uploads.length > 1) {
      // TODO: wire this through to a UI error
      throw new Error(
        'A reupload map ID was specified, but more than one file was selected to be uploaded.'
      );
    }
    // Kick off initial uploads
    Array(MAX_CONNECTIONS)
      .fill(0)
      .map(() => this.processQueue(reuploadMapId));
    return new Promise<[string[], string[]]>((res) => {
      const intervalHandler = setInterval(() => {
        // Work on the next queue item
        if (this.uploads.every((u) => u.state === 'error' || u.state === 'success')) {
          clearInterval(intervalHandler);
          res([
            this.uploads.filter((u): u is UploadSuccess => u.state === 'success').map((u) => u.id),
            this.uploads
              .filter((u): u is UploadError => u.state === 'error')
              .map((u) => u.errorMessage),
          ]);
        } else if (
          this.uploads.some((u) => u.state === 'pending') &&
          this.uploads.filter((u) => u.state === 'uploading').length < MAX_CONNECTIONS
        ) {
          this.processQueue();
        }
      }, 500);
    });
  }

  @action addFiles(files: UploadState[]) {
    files.forEach((f) => {
      this.uploads.push(f);
    });
  }

  @action reset() {
    this.uploads = [];
  }
}

export type SubmitMapField = 'files';
export class SubmitMapStore extends FormStore<SubmitMapField> {
  id?: string = undefined;
  @observable accessor files = new Map<string, UploadState>();

  @computed get filenames() {
    return [...this.files.values()].map((f) => f.file.name).sort((a, b) => a.localeCompare(b));
  }

  constructor(id?: string) {
    super();
    this.id = id;
  }

  @action reset() {
    this.files = new Map();
  }
}

export class SubmitMapPresenter extends FormPresenter<SubmitMapField> {
  constructor(
    private readonly uploader: ThrottledMapUploader,
    private readonly store: SubmitMapStore,
    private readonly router: AppRouterInstance
  ) {
    super(store);
  }

  @action.bound onChangeData(files: FileList) {
    this.clearErrors();
    if (this.store.id != null && files.length > 1) {
      this.pushErrors(['files'], 'When reuploading a map, you can only select a single file.');
      return;
    }
    for (const file of files) {
      let f: UploadState;
      if (!zipTypes.includes(file.type)) {
        f = { state: 'error', file, errorMessage: 'File is not a zip' };
      } else if (file.size > 1024 * 1024 * 100) {
        // 100MiB. We use MiB because that's what Windows displays in Explorer and therefore what users will expect.
        f = { state: 'error', file, errorMessage: 'File is over 100MB' };
      } else {
        f = { state: 'pending', file };
      }
      // Deduplicate by both filename and byte size
      const key = `${file.name}-${file.size}`;
      this.store.files.set(key, f);
    }
  }

  readonly submit = async () => {
    this.uploader.addFiles([...this.store.files.values()]);
    this.store.reset();
    const [ids, errors] = await this.uploader.start(this.store.id);

    if (errors.length !== 0) {
      // TODO: show errors
    } else if (ids.length === 1) {
      this.router.push(routeFor([RoutePath.MAP, ids[0]]));
    } else {
      this.router.push(routeFor([RoutePath.MAP_LIST]));
    }
  };
}
