import { checkExists } from 'base/preconditions';
import { action, computed, observable, runInAction } from 'mobx';
import * as nanoid from 'nanoid';
import { Api } from 'pages/paradb/base/api/api';
import { FormPresenter, FormStore } from 'pages/paradb/base/form/form_presenter';
import { Navigate } from 'pages/paradb/router/install';
import { RoutePath } from 'pages/paradb/router/routes';
import { SubmitMapSuccess } from 'paradb-api-schema';

const zipTypes = ['application/zip', 'application/x-zip', 'application/x-zip-compressed'];
const zipPrefixes = zipTypes.map(t => `data:${t};base64,`);

type UploadState = {
  file: File;
  isSubmitting: boolean,
  progress: number,
};

const MAX_CONNECTIONS = 4;
export class ThrottledMapUploader {
  @observable.deep
  private readonly uploads = new Map<string, UploadState>();

  @observable.shallow
  private readonly queue = new Map<string, File>();
  @observable.shallow
  private readonly successes = new Map<File, SubmitMapSuccess>();
  @observable.shallow
  private readonly errors = new Map<File, string>();

  constructor(private readonly api: Api) { }

  @computed
  get isUploading() {
    return [...this.uploads.values()].some(s => s.isSubmitting);
  }

  @computed
  get uploadProgress() {
    const queued = [...this.queue.values()].map(f => ({
      name: f.name,
      progress: 0,
    }));
    const uploading = [...this.uploads.values()].map(s => ({
      name: s.file.name,
      progress: s.progress,
    }));
    const done = [...this.successes.keys()].map(f => ({
      name: f.name,
      progress: 100,
    }));
    const errors = [...this.errors.keys()].map(f => ({
      name: f.name,
      progress: -1,
    }));
    return [
      ...queued,
      ...uploading,
      ...done
    ].sort((a, b) => a.name.localeCompare(b.name));
  }

  private async fileToMapData(file: File) {
    const maybeMapData = await asBase64(checkExists(file));
    if (maybeMapData == null) {
      this.errors.set(file, 'Unknown error.');
      return;
    }
    let mapData = checkExists(maybeMapData);
    const prefix = zipPrefixes.find(p => mapData.startsWith(p));
    if (!prefix) {
      this.errors.set(file, 'Not a valid zipped map.');
      return;
    }
    mapData = mapData.substr(prefix.length);
    return mapData;
  }

  private getNextInQueue() {
    if (this.uploads.size >= MAX_CONNECTIONS) {
      return;
    }
    const entry = this.queue.entries().next().value;
    if (!entry) {
      return;
    }
    const [id, file] = entry;
    this.queue.delete(id);
    return [id, file];
  }

  private async processQueue() {
    const next = this.getNextInQueue();
    if (!next) {
      return;
    }
    const [id, file] = next;
    runInAction(() => {
      this.uploads.set(id, {
        file,
        isSubmitting: true,
        progress: 0,
      });
    });
    const mapData = await this.fileToMapData(file);
    if (!mapData) {
      return;
    }
    // Re-retrieve the observable wrapped version
    const state = checkExists(this.uploads.get(id));
    const onProgress = action((e: ProgressEvent) => {
      state.progress = Math.round(e.loaded / e.total);
    });
    const resp = await this.api.submitMap({ mapData }, onProgress);
    if (resp.success) {
      this.successes.set(file, resp);
    } else {
      this.errors.set(file, resp.errorMessage);
    }
    runInAction(() => {
      state.isSubmitting = false;
      this.uploads.delete(id);
    });
    // Kick off the next in queue
    await this.processQueue();
  }

  async start() {
    await Promise.all(Array(MAX_CONNECTIONS).fill(0).map((_, i) => this.processQueue()));
    return [
      [...this.successes.values()].map(r => r.id),
      [...this.errors.values()],
    ];
  }

  addFile(file: File) {
    const id = nanoid.nanoid();
    this.queue.set(id, file);
  }

  addFiles(files: File[]) {
    files.forEach(f => this.addFile(f));
  }

  reset() {
    this.uploads.clear();
    this.queue.clear();
    this.successes.clear();
    this.errors.clear();
  }
}

export type FileState = {
  file: File,
  error?: string,
};
export type SubmitMapField = 'files';
export class SubmitMapStore extends FormStore<SubmitMapField> {
  @observable.shallow
  files = new Map<string, FileState>();

  @computed
  get filenames() {
    return [...this.files.values()].map(f => f.file.name).sort((a, b) => a.localeCompare(b));
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
  }

  @action.bound
  onChangeData(files: FileList) {
    for (const file of files) {
      const fileState: FileState = {
        file,
      };
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
    const fieldValues = {
      files: this.store.files,
    };
    this.checkRequiredFields(['files', fieldValues.files]);
    if (this.store.hasErrors) {
      return;
    }
    this.uploader.addFiles([...fieldValues.files.values()].map(s => s.file));
    const [ids, errors] = await this.uploader.start();

    if (errors.length !== 0) {
      // TODO: show errors
    } else if (ids.length === 1) {
      this.navigate([RoutePath.MAP, ids[0]])
    } else {
      this.navigate([RoutePath.MAP_LIST]);
    }
  };
}

function asBase64(blob: Blob): Promise<string | undefined> {
  return new Promise((res) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onload = () => res(reader.result?.toString());
    reader.onerror = () => res(undefined);
  });
}
