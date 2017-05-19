import * as sinon from 'sinon';
import * as chai from 'chai';
import { expect } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);

import * as nock from 'nock';
nock.disableNetConnect();

// Use a fake database.
import * as fakedb from './fake-db';
fakedb.init('../src/db');

// Use a fake Speech API.
import * as fakespeech from './fake-speech';
fakespeech.init();

// Use a fake Translate API.
import * as faketranslate from './fake-translate';
faketranslate.init();

// Use a fake Firebase configuration.
import * as fakeconfig from './fake-config';
fakeconfig.init();

// Use a fake Firebase Admin.
import * as fakeadmin from './fake-admin';
fakeadmin.init();

// Ready to go!
import * as saythat from '../src/saythat';

// Some test input data that we'll use in multiple tests.
const url = 'myurl://test';
const userId = '30hLypzZHnPHWrhw0pLx494fFsI2'
const lang = 'nl-NL';
const timestamp = '1494364778488';
const filename = `speech/${userId}.${lang}.${timestamp}.raw`;
const scene = 'myCoolFancyScene';

describe('saythat', () => {
  beforeEach(async () => {
    faketranslate.reset();
    fakedb.reset();
    await fakedb.set('/admin/current_scene', scene);
    await fakedb.set(`/users/${userId}/lang/code`, lang);
  });

  describe('setDefaults', () => {
    it('should set the default language', async () => {
      await saythat.setDefaults(userId);
      await expect(fakedb.get(`/users/${userId}`)).to.eventually.deep.equal({
        lang: {
          name: 'English',
          code: 'en-US'
        },
      });
    });
  });

  describe('analyzeSpeech', () => {
    it('should parse the components of a speech filename correctly', async () => {
      const noun = 'appeltaart';
      fakespeech.setResponse([noun]);
      fakedb.set(`/users/${userId}/scenes/${scene}/in_progress/${timestamp}`, '...');

      await saythat.analyzeSpeech(url, filename);
      await expect(fakespeech.getLastUrl()).to.equal(url);
      await expect(fakespeech.getLastRequest().languageCode).to.equal(lang);
      await expect(fakespeech.getLastRequest().encoding).to.equal('LINEAR16');
      await expect(fakedb.get(`/users/${userId}/scenes/${scene}/nouns/${noun}`)).to.eventually.equal('maybe...');
      await expect(fakedb.has(`/users/${userId}/scenes/${scene}/in_progress/${timestamp}`)).to.equal(false);
    });

    it('should parse multiple words into multiple guesses', async () => {
      fakespeech.setResponse(['veel kleine appeltaartjes']);

      await saythat.analyzeSpeech(url, filename);
      await expect(fakedb.get(`/users/${userId}/scenes/${scene}/nouns/veel`)).to.eventually.equal('maybe...');
      await expect(fakedb.get(`/users/${userId}/scenes/${scene}/nouns/kleine`)).to.eventually.equal('maybe...');
      await expect(fakedb.get(`/users/${userId}/scenes/${scene}/nouns/appeltaartjes`)).to.eventually.equal('maybe...');
    });

    it('should ignore secondary transcriptions returned by the speech API', async () => {
      fakespeech.setResponse(['meer', 'kleine', 'appeltaartjes']);

      await saythat.analyzeSpeech(url, filename);
      await expect(fakedb.get(`/users/${userId}/scenes/${scene}/nouns/meer`)).to.eventually.equal('maybe...');
      await expect(fakedb.has(`/users/${userId}/scenes/${scene}/nouns/kleine`)).to.equal(false);
      await expect(fakedb.has(`/users/${userId}/scenes/${scene}/nouns/appeltaartjes`)).to.equal(false);
    });

    it('should always output lower-case resuls', async () => {
      fakespeech.setResponse(['Cantaloupe']);

      await saythat.analyzeSpeech(url, filename);
      await expect(fakedb.get(`/users/${userId}/scenes/${scene}/nouns/cantaloupe`)).to.eventually.equal('maybe...');
    });
  });

  describe('judgeGuessedNoun', () => {
    let langs = {
      langs: {
        'nl-NL': 1,
        'de-DE': 1,
      },
      num_langs: 2,
      score: 2,
    };
    let noun = 'taart';
    let english = 'pie';
    function insertCorrectNoun() {
      fakedb.set(`/admin/scenes/${scene}/nouns/${lang}/${noun}`, english);
      let langObj = {};
      langObj[noun] = english;
      fakedb.set(`/admin/scenes/${scene}/nouns/${lang}`, langObj);
    }

    it('should accurately determine incorrectness', async () => {
      await fakedb.set(`/users/${userId}/scenes/${scene}/score`, 0);
      await fakedb.set(`/summary/${scene}/${noun}`, langs);

      await saythat.judgeGuessedNoun(userId, scene, noun, false);
      await expect(fakedb.get(`/users/${userId}/scenes/${scene}/nouns/${noun}`)).to.eventually.equal('false');
      await expect(fakedb.get(`/users/${userId}/scenes/${scene}/score`)).to.eventually.equal(0);
      await expect(fakedb.get(`/all_guesses/${scene}/pushprefix-0`)).to.eventually.deep.equal({
        original: noun,
        correctness: "false",
        lang: lang,
        translated: null,
      });
      await expect(fakedb.get(`/summary/${scene}/${noun}`)).to.eventually.deep.equal(langs);
    });

    it('should accurately determine correctness', async () => {
      insertCorrectNoun();
      fakedb.set(`/users/${userId}/scenes/${scene}/score`, 0);
      await fakedb.set(`/summary/${scene}/${english}`, langs);

      await saythat.judgeGuessedNoun(userId, scene, noun, false);
      await expect(fakedb.get(`/users/${userId}/scenes/${scene}/nouns/${noun}`)).to.eventually.equal('true');
      await expect(fakedb.get(`/users/${userId}/scenes/${scene}/score`)).to.eventually.equal(1);
      await expect(fakedb.get(`/all_guesses/${scene}/pushprefix-0`)).to.eventually.deep.equal({
        original: noun,
        correctness: "true",
        lang: lang,
        translated: english,
      });
      await expect(fakedb.get(`/summary/${scene}/${english}`)).to.eventually.deep.equal({
        langs: {
          'nl-NL': 2,
          'de-DE': 1,
        },
        num_langs: 2,
        score: 3,
      });
    });

    it('should initialize the score if there wasn\'t one yet', async () => {
      insertCorrectNoun();

      await saythat.judgeGuessedNoun(userId, scene, noun, false);
      await expect(fakedb.get(`/users/${userId}/scenes/${scene}/score`)).to.eventually.equal(1);
      await expect(fakedb.get(`/summary/${scene}/${english}`)).to.eventually.deep.equal({
        langs: {
          'nl-NL': 1,
        },
        num_langs: 1,
        score: 1,
      });
    });

    it('should not override existing language counters when adding a new one', async () => {
      insertCorrectNoun();
      await fakedb.set(`/summary/${scene}/${english}`, {
        langs: {
          'de-DE': 1,
        },
        num_langs: 1,
        score: 1,
      });

      await saythat.judgeGuessedNoun(userId, scene, noun, false);
      await expect(fakedb.get(`/users/${userId}/scenes/${scene}/score`)).to.eventually.equal(1);
      await expect(fakedb.get(`/summary/${scene}/${english}`)).to.eventually.deep.equal({
        langs: {
          'de-DE': 1,
          'nl-NL': 1,
        },
        num_langs: 2,
        score: 2,
      });
    });

    it('should filter out duplicate guesses from the same user', async () => {
      insertCorrectNoun();
      fakedb.set(`/users/${userId}/scenes/${scene}/score`, 1);

      await saythat.judgeGuessedNoun(userId, scene, noun, true /* guessed_before */);
      await expect(fakedb.get(`/users/${userId}/scenes/${scene}/nouns/${noun}`)).to.eventually.equal('true');
      await expect(fakedb.get(`/users/${userId}/scenes/${scene}/score`)).to.eventually.equal(1);
    });
  });

  describe('updateCollectiveScores', () => {
    it('should create non-existing collective scores', async () => {
      await saythat.updateCollectiveScores(userId, scene, 1);
      await expect(fakedb.get(`/total_scores/${scene}`)).to.eventually.equal(1);
      await expect(fakedb.get(`/total_langs/${scene}`)).to.eventually.deep.equal({
        'nl-NL': 1,
        'numLanguages': 1,
      });
    });

    it('should increment existing collective scores', async () => {
      fakedb.set(`/total_scores/${scene}`, 10);
      fakedb.set(`/total_langs/${scene}`, {
        'nl-NL': 5,
        'de-DE': 5,
        'numLanguages': 2,
      });

      await saythat.updateCollectiveScores(userId, scene, 1);
      await expect(fakedb.get(`/total_scores/${scene}`)).to.eventually.equal(11);
      await expect(fakedb.get(`/total_langs/${scene}`)).to.eventually.deep.equal({
        'nl-NL': 6,
        'de-DE': 5,
        'numLanguages': 2,
      });
    });
  });

  describe('nounAdded', () => {
    it('should translate a single noun to all languages', async () => {
      faketranslate.setResponse('nl', ['kaas']);
      faketranslate.setResponse('fr', ['fromage']);

      await saythat.nounAdded(scene, 'cheese');
      // 44 languages, but no translation is done for English.
      await expect(faketranslate.getNumTranslations()).to.equal(43);
      await expect(fakedb.get(`/admin/scenes/${scene}/nouns/nl-NL/kaas`)).to.eventually.equal('cheese');
      await expect(fakedb.get(`/admin/scenes/${scene}/nouns/fr-FR/fromage`)).to.eventually.equal('cheese');
      await expect(fakedb.get(`summary/${scene}/cheese`)).to.eventually.deep.equal({
        num_langs: 0,
        score: 0
      });
    });

    it('should be able to deal with various array-formatted replies', async () => {
      faketranslate.setResponse('nl', ['kaas', 'kaasje', 'Kelly']);
      faketranslate.setResponse('fr', [['fromage', 'omelette']]);

      await saythat.nounAdded(scene, 'cheese');
      await expect(fakedb.get(`/admin/scenes/${scene}/nouns/nl-NL/kaas`)).to.eventually.equal('cheese');
      await expect(fakedb.get(`/admin/scenes/${scene}/nouns/fr-FR/fromage`)).to.eventually.equal('cheese');
    });

    it('should lower-case nouns', async () => {
      faketranslate.setResponse('de', ['Morgen']);

      await saythat.nounAdded(scene, 'morning');
      await expect(fakedb.get(`/admin/scenes/${scene}/nouns/de-DE/morgen`)).to.eventually.equal('morning');
    });
  });
});
