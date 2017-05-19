import * as mock from 'mock-require';

let fakeAdmin = {
  initializeApp: () => { },
  database: () => {
    throw Error('Wow, this fake firebase-admin should not actually be used!');
  },
};

export function init() {
  mock('firebase-admin', fakeAdmin);
}

