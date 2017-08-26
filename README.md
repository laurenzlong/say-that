# Collaborative Crowd Game #
 
[SayThat](https://saythat.io) is a game where players watch a video together on a big screen (such as a projector), and speak or type to their phones in their language of choice what they see on the screen. Players score points when they correctly guess a word that the Cloud Video Intelligence API produced when analyzing the video.

The game was first created for a talk at Google I/O 2017 titled **Supercharging Firebase Apps with Machine Learning and Cloud Function**. You can watch the video [here](https://www.youtube.com/watch?v=RdqV_N0sCpM).
 
This game highlights how [Cloud Functions for Firebase](https://firebase.google.com/docs/functions/) can be used to easily add Machine Learning to an app. The code in this repository demonstrates uses of:
 
* Cloud Speech API
* Cloud Translate API
 
Additionally, to analyze the video and produce the words to be guessed, we propose using the Cloud Video Intelligence API to annotate your videos. 
 
### Gameplay Architecture
A game involves the following steps:
 
* The administrator prepares a number of videos to show, and populates a list of relevant words to guess in the Firebase Database, using the data layout described below. Specifically, they add nouns under the path `/admin/scenes/{scene}/nouns/en-US/{noun}`.
  * The Cloud Function `translateNoun` triggers, to translate the noun into all supported languages.
  * The translations are written to `/admin/scene/{scene}/nouns/{language_code}/{noun}`.
* Users go to the game and log in.
  * The Cloud Function `setDefaults` triggers to set the user's default language.
* Users speak a word.
  * An audio file with the recording is uploaded to Cloud Storage for Firebase.
  * The Cloud Function `analyzeSpeech` triggers, which uses the Cloud Speech API to transcribe the spoken word.
  * The guessed word (noun) is written back to the Firebase Database, as if it were typed in directly by the user.
* User types a word.
  * The guess is written to the Firebase Realtime Database.
  * The Cloud Function `judgeGuessedNoun` triggers, which assigns a score (0 or 1) to the guessed noun.
  * The score is written back to the Firebase Realtime Database.
* The score is updated.
  * The Cloud Function `updateCollectiveScores` triggers, which updates all audience-total scores.
 
### Code layout
This repository follows the common Firebase pattern of storing its static public files in a `public` directory, and storing its server-side Cloud Functions for Firebase code in the `functions` directory.
 
The game has two main screens:
 
* The game screen is the one which users use to play the game on their phones. It is served from `public/index.html`, executing JavaScript code in `public/scripts/index.js`.
* The projector screen is the one which is displayed on the large screen all users are watching. It is served from `public/projector/index.html`, executing JavaScript code in `public/scripts/projector.js`.
 
The videos to play the game are not provided with the source code; the developers will want to source their own. The resulting videos, e.g. `dog.mp4` should be placed in the `public/videos` folder, e.g. as `public/videos/dog.mp4`.
 
All the server-side Cloud Functions for Firebase code is written in TypeScript, and is found in the `functions/src` directory. It is unit-tested by the code in the `functions/spec` directory. To compile this code, run:
 
```
$ npm run build
```
 
To build and run unit tests, run:
```
$ npm test
```
 
To build, run unit tests, and deploy to the Firebase project with the `prod` alias, run:
```
$ npm run deploy-prod
```
 
### Data layout
SayThat uses the Firebase Realtime Database to store its data and synchronize it with clients and servers. The minimal data structure is:
```
+ "admin"
  + "active": true  // Flag to enable/disable guess-buttons on clients. Start with 'true'.
  + "current_scene": ... // The name of the current scene. E.g. "beach".
  + "scenes"
    + {scene_name}  // E.g. "beach".
      + "nouns"
        + "en-US"  // Words added to this list will automatically get translated.
          + {some_noun}: {some_noun}  // E.g. "sand": "sand".
          + {some_other_noun}: {some_other_noun}  // E.g. "surf": "surf".
          + ...
    + {another_scene_name}  // E.g. "dog".
      + ...
```
The remainder of the data structure is generated automatically by the code. 
 
### Deploying the code
Begin by creating a project in the [Firebase Console](https://console.firebase.google.com/). Use the Console to pre-fill the Firebase Database with the data structure described above.
 
Make sure you have the latest `firebase` command-line tool installed by running:
```
$ npm install -g firebase-tools
```
 
Next, clone this repository to a convenient directory on your machine. Within that...
 
* Create a `public/videos` folder.
* Add a few videos to that folder, using names like `beach.mp4` for a video that's associated with the scene `beach`.
 
Next, within the project folder, run:
```
$ firebase init
```
In the wizard, choose to enable the Database, Functions and Hosting.
 
We must allow the Cloud Speech API to read objects uploaded to Cloud Storage for Firebase. This is easiest to do from Google's larger [Cloud Console](https://console.cloud.google.com/), which serves both Firebase and the larger Google Cloud Platform. In the Cloud Console...
 
* Make sure you select the correct project in the drop-down menu at the top.
* Click the "hamburger menu" (three horizontal stripes) at the left-top.
* Click "Storage" in the menu that pops out. You'll see a list of your Cloud Storage "buckets".
* On the far right of the first bucket, click the three vertical dots that open its overflow menu.
* Click "Edit default object permissions".
* Add an entry that specifies:
  * Entity: "User"
  * Name: "allUsers"
  * Access: "Reader"
* Click "Save".
 
We're now ready to deploy our code, by running:
```
$ npm run build
$ npm test
$ firebase deploy
```
 
If you want to use multiple projects, such as a staging-project and a production-project, we suggest adding a `prod` alias for your production project:
```
$ firebase use --add
```
 
You may now shortcut the build, test and deploy step with a single command:
```
$ npm run deploy-prod
```
