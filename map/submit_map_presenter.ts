import { action, observable, runInAction } from 'mobx';
import { Api } from 'pages/paradb/base/api/api';
import { FormPresenter, FormStore } from 'pages/paradb/base/form/form_presenter';
import { Navigate } from 'pages/paradb/router/install';
import { RoutePath } from 'pages/paradb/router/routes';
import { Complexity } from 'paradb-api-schema';

export const complexityNumericKey = (i: number): `complexityNumeric${number}` => `complexityNumeric${i}`;
export const complexityNameKey = (i: number): `complexityName${number}` => `complexityName${i}`;

export type SubmitMapField = 'title' | 'artist' | 'author' | 'albumArt' | 'downloadLink' | 'description' | `complexityNumeric${number}` | `complexityName${number}`;
export class SubmitMapStore extends FormStore<SubmitMapField> {
  @observable.deep
  complexities: Complexity[] = [{ complexity: 1, complexityName: 'Easy' }];

  @observable.ref
  title = '';

  @observable.ref
  artist = '';

  @observable.ref
  author = '';

  @observable.ref
  albumArt = '';

  @observable.ref
  description = '';

  @observable.ref
  downloadLink = '';

  @observable.ref
  isSubmitting = false;

  @action.bound
  reset() {
    this.errors.clear();
    this.complexities = [{ complexity: 1, complexityName: 'Easy' }];
    this.title = '';
    this.artist = '';
    this.author = '';
    this.albumArt = '';
    this.description = '';
    this.downloadLink = '';
    this.isSubmitting = false;
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

  onChangeTitle = action((value: string) => this.store.title = value);
  onChangeArtist = action((value: string) => this.store.artist = value);
  onChangeAuthor = action((value: string) => this.store.author = value);
  onChangeAlbumArt = action((value: string) => this.store.albumArt = value);
  onChangeDescription = action((value: string) => this.store.description = value);
  onChangeDownloadLink = action((value: string) => this.store.downloadLink = value);

  addComplexity = action(() => {
    this.store.complexities.push({ complexity: 1, complexityName: '' });
  });

  removeComplexity = action((i: number) => {
    this.store.complexities.splice(i, 1);
    if (this.store.errors.has(complexityNameKey(i))) {
      this.store.errors.delete(complexityNameKey(i));
    }
    if (this.store.errors.has(complexityNumericKey(i))) {
      this.store.errors.delete(complexityNumericKey(i));
    }
    for (let j = i + 1; j < this.store.complexities.length + 1; j++) {
      const nameError = this.store.errors.get(complexityNameKey(j));
      const numericError = this.store.errors.get(complexityNumericKey(j));
      if (nameError != null) {
        this.store.errors.set(complexityNameKey(j - 1), nameError);
        this.store.errors.delete(complexityNameKey(j));
      }
      if (numericError != null) {
        this.store.errors.set(complexityNumericKey(j - 1), numericError);
        this.store.errors.delete(complexityNumericKey(j));
      }
    }
  });

  submit = async () => {
    runInAction(() => this.store.errors.clear());
    const fieldValues = {
      title: this.store.title,
      artist: this.store.artist,
      author: this.undefinedIfEmpty(this.store.author),
      albumArt: this.undefinedIfEmpty(this.store.albumArt),
      description: this.undefinedIfEmpty(this.store.description),
      downloadLink: this.store.downloadLink,
    };
    const errors = [
      ...this.checkRequiredFields(
        ['title', fieldValues.title],
        ['artist', fieldValues.artist],
        ['downloadLink', fieldValues.downloadLink],
        ...this.store.complexities.flatMap((c, i) => [
          [complexityNumericKey(i), c.complexity.toString()],
          [complexityNameKey(i), c.complexityName]
        ] as const),
      ),
      ...this.checkUrlFields(
        ['albumArt', fieldValues.albumArt],
        ['downloadLink', fieldValues.downloadLink],
      ),
    ];
    if (errors.length) {
      return;
    }

    runInAction(() => this.store.isSubmitting = true);
    const resp = await this.api.submitMap({
      ...fieldValues,
      complexities: this.store.complexities,
    });
    runInAction(() => this.store.isSubmitting = false);

    if (resp.success) {
      this.navigate([RoutePath.MAP, resp.id]);
    } else {

    }
  };
}
