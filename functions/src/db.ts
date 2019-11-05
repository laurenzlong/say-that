/**
 * Copyright 2017 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
admin.initializeApp(functions.config().firebase);

export function get(path: string): Promise<string> {
  return admin.database().ref(path).once('value').then(snapshot => {
    return snapshot.val();
  });
}

export function set(path: string, value: any): Promise<void> {
  return admin.database().ref(path).set(value)
}

export function push(path: string, value: any): Promise<void> {
  return admin.database().ref(path).push(value);
}

export function remove(path: string): Promise<void> {
  return admin.database().ref(path).remove();
}

export function transaction(path: string, callback): Promise<any> {
  return admin.database().ref(path).transaction(callback);
}

