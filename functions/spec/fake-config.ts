import * as sinon from 'sinon';
import * as functions from 'firebase-functions';

export function init() {
  sinon.stub(functions, 'config').returns({
    firebase: {
      storageBucket: 'fake-bucket',
      databaseURL: 'https://testingfake.firebaseio.com',
    },
  });
}
