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
import * as _ from 'lodash';
import * as speechAPI from '@google-cloud/speech';
import * as translateAPI from '@google-cloud/translate';
import * as db from './db';
import * as ProfanityFilter from 'bad-words';

const speech = speechAPI();
const translate = translateAPI();
const profanityFilter = new ProfanityFilter({ replaceRegex:  /[A-Za-z0-9가-힣_]/g });

export function setDefaults(userId: string): Promise<void> {
  return db.set(`/users/${userId}`, {
    lang: { // Default language to English
      name: 'English',
      code: 'en-US'
    }
  });
}

const speechFilenameRegex = /(\w*).([a-zA-Z\-]*).(\d*).raw/;
export async function analyzeSpeech(url, filename) {
  // Parse the filename into its components, which give us user ID, language,
  // and timestamp.
  const components = filename.match(speechFilenameRegex);
  if (components == null) {
    console.error('Failed to parse filename ' + filename);
    return;
  }
  const userId = components[1];
  const languageCode = components[2];
  const timestamp = components[3];

  // Detect speech in the audio file using the Cloud Speech API.
  const request = {
    encoding: 'LINEAR16',
    languageCode: languageCode,
    profanityFilter: true,
  };
  const results = await speech.recognize(url, request);
  let transcription = results[0];
  const scene = await db.get('/admin/current_scene');
  if (transcription == '') {
    console.log('Empty transcription, not written.');
    await markProcessCompleted(userId, scene, timestamp);
    return;
  }
  let nouns = transcription.split(' ');

  // Persist user guesses in the Firebase Realtime Database.
  await writeNounsAsGuesses(nouns, userId, scene);
  await markProcessCompleted(userId, scene, timestamp);
}

function writeNounsAsGuesses(nouns, userId, scene): Promise<any> {
  let operations = [];
  for (let index in nouns) {
    let noun = nouns[index].toLowerCase();
    operations.push(db.set(`/users/${userId}/scenes/${scene}/nouns/${noun}`, 'maybe...'));
  }
  return Promise.all(operations);
}

function markProcessCompleted(userId, scene, timestamp) {
  return db.remove(`/users/${userId}/scenes/${scene}/in_progress/${timestamp}`);
}

export async function judgeGuessedNoun(userId, scene, noun, guessed_before): Promise<any> {
  noun = profanityFilter.clean(noun).toLowerCase();

  // Determine the user's chosen language.
  let lang = await getUserLanguage(userId);

  // Determine if the guessed noun appears in the scene, and its English
  // translation.
  let english = await getOriginalNoun(noun, scene, lang);
  let correct = english !== null ? 'true' : 'false';
  let score_diff = correct === 'true' && !guessed_before ? 1 : 0;

  // Write the score to all parts of the Firebase Realtime Database that need to
  // know.
  return Promise.all([
    updateAllGuesses(scene, noun, correct, lang, english),
    updateCorrectness(userId, scene, noun, correct),
    updateScore(userId, scene, score_diff),
    updateSummary(scene, english, lang, score_diff),
  ]);
}

function getUserLanguage(userId: string): Promise<string> {
  return db.get(`/users/${userId}/lang/code`);
}

// Returns null if the given noun was not found for the given scene and
// language.
async function getOriginalNoun(
  noun: string, scene: string, lang: string): Promise<string> {

  let nouns = await db.get(`/admin/scenes/${scene}/nouns/${lang}`);
  if (!_.has(nouns, noun)) {
    return null;
  }
  return nouns[noun];
}

function updateAllGuesses(
  scene: string, noun: string, correct: string, lang: string, english: string) {

  return db.push(`/all_guesses/${scene}`, {
    original: noun,
    correctness: correct,
    lang: lang,
    translated: english,
  });
}

function updateCorrectness(userId: string, scene: string, noun: string, correct: string) {
  return db.set(`/users/${userId}/scenes/${scene}/nouns/${noun}`, correct);
}

function updateScore(userId: string, scene: string, diff: number): Promise<void> {
  if (diff === 0) return;
  return db.transaction(`/users/${userId}/scenes/${scene}/score`,
    val => val ? val + diff : diff);
}

function updateSummary(scene: string, english_noun: string, lang: string, score_diff: number) {
  if (score_diff <= 0) return;
  return db.transaction(`/summary/${scene}/${english_noun}`, val => {
    if (val === null) {
      val = {};
    }
    if (val.langs === undefined || val.langs === null || val.langs === 0) {
      val.langs = {};
    }
    if (!_.has(val.langs, lang)) {
      val.langs[lang] = score_diff;
    } else {
      val.langs[lang] += score_diff;
    }
    if (val.langs[lang] === 0) {
      delete val.langs[lang];
    }
    val.num_langs = _.size(val.langs);
    if (val.score === undefined || val.score === null) {
      val.score = 0;
    }
    val.score += score_diff;
    return val;
  });
}

export async function updateCollectiveScores(userId: string, scene: string, diff: number) {
  let userLang = await getUserLanguage(userId);

  let operations = [];
  operations.push(db.transaction(`/total_scores/${scene}`, val => val + diff));
  operations.push(db.transaction(`/total_langs/${scene}`, val => {
    if (val === null) {
      val = {};
    }
    if (!_.has(val, 'numLanguages')) {
      val['numLanguages'] = 0;
    }
    if (!_.has(val, userLang) || val[userLang] == 0) {
      val['numLanguages'] += 1;
      val[userLang] = 0;
    }
    val[userLang] += diff;
    if (val[userLang] <= 0) {
      val['numLanguages'] -= 1;
      val[userLang] = 0;
    }
    return val;
  }));

  await Promise.all(operations);
}

// There are two standardized ways to represent language codes: a localized
// version, which distinguishes between accents and regions and such (BCP-47)
// and a generic just-the-language code (ISO-639-2). The Speech API uses BCP-47,
// the Translate API uses ISO-639 Alas, they don't match exactly, especially
// around the various Chinese languages, and so we must map them manually.
import bcp47toISO639 from './bcp47iso639';
export function nounAdded(scene: string, noun: string) {
  let operations = [];
  _.forEach(bcp47toISO639, (iso639code, bcp47code) => {
    if (bcp47code == 'en-US') {
      // This is our source language.
      return;
    }
    let options = {
      from: 'en',
      to: iso639code,
    };
    operations.push(translate.translate(noun, options).then(results => {
      let translations = results[0];
      let translation = Array.isArray(translations) ? translations[0] : translations;
      translation = translation.toLowerCase();  // For cases like German, which capitalizes nouns.
      return db.set(`/admin/scenes/${scene}/nouns/${bcp47code}/${translation}`, noun);
    }));
    operations.push(db.set(`summary/${scene}/${noun}`, {
      num_langs: 0,
      score: 0
    }));
  });
  return Promise.all(operations);
}

