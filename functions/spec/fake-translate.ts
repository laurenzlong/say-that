import * as mock from 'mock-require';

let defaultResponse;
let languageResponse;
let lastInput;
let lastOptions;
let numTranslations;

export function reset() {
  defaultResponse = ['unset'];
  languageResponse = {};
  lastInput = '';
  lastOptions = {};
  numTranslations = 0;
}

// This is the actual method being faked.
export let translate = {
  translate: (input, options) => {
    lastInput = input;
    lastOptions = options;
    numTranslations++;
    if (languageResponse.hasOwnProperty(options.to)) {
      return Promise.resolve(languageResponse[options.to]);
    }
    return Promise.resolve(defaultResponse);
  },
};

export function setDefaultResponse(r: any) {
  defaultResponse = r;
}

export function setResponse(lang: string, r: any) {
  languageResponse[lang] = r;
}

export function getLastInput(): any {
  return lastInput;
}

export function getLastOptions(): any {
  return lastOptions;
}

export function getNumTranslations(): number {
  return numTranslations;
}

export function init() {
  mock('@google-cloud/translate', () => translate);
}
