import { checkExists } from 'base/preconditions';
import { action, observable, runInAction } from 'mobx';
import { Api } from 'pages/paradb/base/api/api';
import { FormPresenter, FormStore } from 'pages/paradb/base/form/form_presenter';
import { Navigate } from 'pages/paradb/router/install';
import { RoutePath } from 'pages/paradb/router/routes';

const zipPrefix = 'data:application/x-zip-compressed;base64,';

export type SubmitMapField = 'data';
export class SubmitMapStore extends FormStore<SubmitMapField> {
  @observable.ref
  isSubmitting = false;

  @observable.ref
  data: File | undefined;

  reset() {
    this.isSubmitting = false;
    this.data = undefined;
  }
}

export class SubmitMapPresenter extends FormPresenter<SubmitMapField> {
  constructor(
    private readonly api: Api,
    private readonly navigate: Navigate,
    private readonly store: SubmitMapStore,
  ) {
    super(store);
  }

  @action.bound
  onChangeData(file: File) {
    this.store.data = file;
  }

  submit = async () => {
    runInAction(() => this.store.errors.clear());
    const fieldValues = {
      data: this.store.data,
    };
    this.checkRequiredFields(['data', fieldValues.data]);
    const maybeMapData = await asBase64(checkExists(fieldValues.data));
    if (maybeMapData == null) {
      this.pushErrors(['data'], 'Invalid map data');
    }
    let mapData = checkExists(maybeMapData);
    if (!mapData.startsWith(zipPrefix)) {
      this.pushErrors(['data'], 'File was not a zip');
    }
    mapData = mapData.substr(zipPrefix.length);
    if (this.store.hasErrors) {
      return;
    }
    runInAction(() => this.store.isSubmitting = true);

    const resp = await this.api.submitMap({ mapData });
    runInAction(() => this.store.isSubmitting = false);

    if (resp.success) {
      this.navigate([RoutePath.MAP, resp.id]);
    } else {

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
