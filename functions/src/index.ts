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
import * as saythat from './saythat';

// When a user first registers, we want to set a few default values.
exports.setDefaults = functions.auth.user().onCreate(event => {
  return saythat.setDefaults(event.data.uid);
});

// When a user uploads a new audio file with the spoken guess for a noun, we
// analyze that audio file (using the Cloud Speech API) and write the
// transcription back into the Firebase Realtime Database as a guessed noun.
exports.analyzeSpeech = functions.storage.object().onChange(async event => {
  if (event.data.resourceState != 'exists' || event.data.metageneration != 1) {
    // We're only interested in newly-created objects.
    return;
  }

  const url = event.data.mediaLink;
  const filename = event.data.name;
  try {
    return saythat.analyzeSpeech(url, filename);
  } catch (err) {
    console.error('Failed to analyze speech. Maybe a permissions issue on the GCS Bucket? ' + err);
  }
});

// When a new guessed noun is written to the Firebase Realtime Database (either
// from the 'analyzeSpeech' function or directly by the user's app when) we'll
// do the actual scorekeeping in this function.
exports.judgeGuessedNoun = functions.database.ref(
  '/users/{userId}/scenes/{scene}/nouns/{noun}').onWrite(async event => {

  // Only respond if the user just freshly guessed this noun.
  if (event.data.val() !== "maybe...") {
    return;
  }

  try {
    let noun = event.params.noun;
    let guessed_before = event.data.previous.exists();
    await saythat.judgeGuessedNoun(event.params.userId, event.params.scene, noun,
                                   guessed_before);
  } catch (err) {
    console.error('Error while judging our noun: ' + err);
  }
});

exports.updateCollectiveScores = functions.database.ref(
  '/users/{userId}/scenes/{scene}/score').onWrite(async event => {

  // Only respond if the score has actually changed.
  let before = event.data.previous.val() ? event.data.previous.val() : 0;
  let after = event.data.current.val() ? event.data.current.val() : 0;
  let diff = after - before;
  if (diff == 0) return;

  try {
    await saythat.updateCollectiveScores(event.params.userId, event.params.scene, diff);
  } catch (err) {
    console.error('Error while updating collective scores: ' + err);
  }
});

// When an administrator adds a new noun to the list of nouns, we should
// pre-compute what the translation of that noun is in all supported languages.
exports.nounAdded = functions.database.ref(
  '/admin/scenes/{scene}/nouns/en-US/{noun}').onWrite(async event => {

  // Only respond if the entry was just added.
  if (!event.data.exists()) {
    return;
  }
  try {
    await saythat.nounAdded(event.params.scene, event.params.noun);
  } catch (err) {
    console.error('Translation error: ' + err);
  }
});

