import * as mock from 'mock-require';

let response = ['unset fake response'];
let lastUrl = '';
let lastRequest = {};
export let speech = {
  recognize: (url, request) => {
    lastUrl = url;
    lastRequest = request;
    return response;
  },
};

export function setResponse(r: string[]) {
  response = r;
}

export function getLastUrl(): any {
  return lastUrl;
}

export function getLastRequest(): any {
  return lastRequest;
}

export function init() {
  mock('@google-cloud/speech', () => speech);
}
