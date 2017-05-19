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
var uiConfig = {
  'callbacks': {
    'signInSuccess': function(user, credential, redirectUrl) {
      handleSignedInUser(user);
      // Do not redirect.
      return false;
    }
  },
  'signInOptions': [
    firebase.auth.GoogleAuthProvider.PROVIDER_ID,
    firebase.auth.GithubAuthProvider.PROVIDER_ID,
    firebase.auth.EmailAuthProvider.PROVIDER_ID
  ]
};

var availableLangs = [
  'Afrikaans',
  'Arabic',
  'Basque',
  'Bulgarian',
  'Catalan',
  'Chinese (Cantonese)',
  'Chinese (Mandarin)',
  'Croatian',
  'Czech',
  'Danish',
  'Dutch',
  'English',
  'Filipino',
  'Finnish',
  'French',
  'Galician',
  'German',
  'Greek',
  'Hebrew',
  'Hindi',
  'Hungarian',
  'Icelandic',
  'Indonesian',
  'Italian',
  'Japanese',
  'Korean',
  'Lithuanian',
  'Malay',
  'Norwegian',
  'Persian',
  'Polish',
  'Portuguese',
  'Romanian',
  'Russian',
  'Serbian',
  'Slovak',
  'Slovenian',
  'Spanish',
  'Swedish',
  'Thai',
  'Turkish',
  'Ukrainian',
  'Vietnamese',
  'Zulu'
];

var langToCode = {
  'Afrikaans': 'af-ZA',
  'Indonesian': 'id-ID',
  'Malay': 'ms-MY',
  'Catalan': 'ca-ES',
  'Czech': 'cs-CZ',
  'Danish': 'da-DK',
  'German': 'de-DE',
  'English': 'en-US',
  'Spanish': 'es-MX',
  'Basque': 'eu-ES',
  'Filipino': 'fil-PH',
  'French': 'fr-FR',
  'Galician': 'gl-ES',
  'Croatian': 'hr-HR',
  'Zulu': 'zu-ZA',
  'Icelandic': 'is-IS',
  'Italian': 'it-IT',
  'Lithuanian': 'lt-LT',
  'Hungarian': 'hu-HU',
  'Dutch': 'nl-NL',
  'Norwegian': 'nb-NO',
  'Polish': 'pl-PL',
  'Portuguese': 'pt-BR',
  'Romanian': 'ro-RO',
  'Slovak': 'sk-SK',
  'Slovenian': 'sl-SI',
  'Finnish': 'fi-FI',
  'Swedish': 'sv-SE',
  'Vietnamese': 'vi-VN',
  'Turkish': 'tr-TR',
  'Greek': 'el-GR',
  'Bulgarian': 'bg-BG',
  'Russian': 'ru-RU',
  'Serbian': 'sr-RS',
  'Ukrainian': 'uk-UA',
  'Hebrew': 'he-IL',
  'Arabic': 'ar-IL',
  'Persian': 'fa-IR',
  'Hindi': 'hi-IN',
  'Thai': 'th-TH',
  'Korean': 'ko-KR',
  'Cantonese': 'yue-Hant-HK',
  'Japanese': 'ja-JP',
  'Mandarin': 'cmn-Hans-CN',
  'Chinese (Mandarin)': 'cmn-Hans-CN',
  'Chinese (Cantonese)': 'yue-Hant-HK'
};