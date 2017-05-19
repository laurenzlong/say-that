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
// Initialize the FirebaseUI Widget using Firebase.
var ui = new firebaseui.auth.AuthUI(firebase.auth());
// Keep track of the currently signed in user.
var uid = null;
var lang = 'English';
var langCode = 'en-US';
var scene = null;
var micCapable = true;
var gameActive = true;

// Database references to manage listeners
var userSceneNounsChangedRef = null;
var userSceneNounsAddedRef = null;
var userSceneScoreValueRef = null;
var audienceScoreValueRef = null;
var userSceneNounsProgressAddedRef = null;
var userSceneNounsProgressRemovedRef = null;

function handleSignedInUser(user) {
  uid = user.uid;
  $("a#change-lang").show();
  $("#user-signed-out").hide();
  $("#user-signed-in").show();
  $("#sign-out").show();
  $(".header-stats").show();
  $("span.input-toggles").show();
  $("footer.mic").show();
  initLanguages();
  handleLangSelection();
  initDisplay();
};

function handleSignedOutUser() {
  ui.start('#firebaseui-container', uiConfig);

  $(".header-stats").hide();
  $("a#change-lang").hide();
  $("#user-signed-out").show();
  $("#user-signed-in").hide();
  $("#sign-out").hide();
  $("footer.mic").hide();
  $("span.input-toggles").hide();
};

function handleLangSelection() {
  lang = $("#lang-picker :selected").text();
  langCode = $('#lang-picker').val();

  if (langCode) {
    $('#lang-display').text(lang);
    firebase.database().ref('users/' + uid + '/lang').set({
      code: langCode,
      name: lang
    });
  }

  $('#lang-picker-container').hide();
  $('#input-container').show();
}

function uploadSpeechFile(blob) {
  $('#start').prop('disabled', false);
  if (!gameActive) {
    alert('Round over, cannot submit more guesses.');
    return;
  }
  var timestamp = Date.now();
  var fileName = 'speech/' + uid + '.' + langCode + '.' + timestamp + '.raw';
  var storageRef = firebase.storage().ref().child(fileName);
  storageRef.put(blob).then(function(snapshot) {
    console.log('uploaded')
    firebase.database().ref('/users/' + uid + '/scenes/' + scene + '/in_progress/' + timestamp)
      .set(fileName);
  })
}

function initTalkBtn() {
  self.micCapable = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

  if (self.micCapable) {
    $('#nomic').hide();

    var timeoutId = 0;
    $('#start').on('mousedown touchstart', function() {
      timeoutId = setTimeout(function() {
        $('#listening-indicator').show();
        $('#btnText').text('Listening');
      }, 500);
      Fr.voice.record(false, function() {});
    }).on('mouseup touchend', function() {
      $('#listening-indicator').hide();
      $('#start').prop('disabled', true);
      $('#btnText').text('Processing');
      Fr.voice.export(function(f) {uploadSpeechFile(f);}, 'blob');
      Fr.voice.stop();
      clearTimeout(timeoutId);
    });

    $("#enable-mic").hide();
    $("#enable-keyboard").show();
  } else {
    toggleMicButton(false);
  }

  $("#enable-keyboard").click(function(e){
    toggleMicButton(false)
  });

  $("#enable-mic").click(function(e){
    toggleMicButton(true)
  });
}

function toggleMicButton(showMic) {
  if (showMic) {
    $("#mic-container").show();
    $("#keyboard_input").hide();
    $("#enable-mic").hide();
    $("#enable-keyboard").show();
  } else {
    $("#mic-container").hide();
    $("#keyboard_input").show();
    $("#enable-keyboard").hide();

    if(self.micCapable) {
      $("#enable-mic").show();
    } else {
      $("#enable-mic").hide();
    }
  }
}

function detachListener(ref) {
  if (ref != null) {
    ref.off();
  }
}

function showMetrics() {  
  detachListener(userSceneScoreValueRef);
  userSceneScoreValueRef = firebase.database().ref('/users/' + uid + '/scenes/' + scene + '/score');
  userSceneScoreValueRef.on('value', function(snapshot) {
    $("#scene_score").html(snapshot.val() != null ? snapshot.val() : 0);
  });

  detachListener(audienceScoreValueRef);
  audienceScoreValueRef = firebase.database().ref('/total_scores/' + scene);
  audienceScoreValueRef.on('value', function(snapshot) {
    $("#audience_score").html(snapshot.val() != null ? snapshot.val() : 0);
  });
}

function showGuesses() {
  detachListener(userSceneNounsAddedRef);
  userSceneNounsAddedRef = firebase.database().ref('/users/' + uid + '/scenes/' + scene + '/nouns');
  userSceneNounsAddedRef.on('child_added', function(snapshot) {
    var noun = snapshot.key;
    var correctness = snapshot.val()
    var $pillbox = $("<span>" + noun + "</span>");
    $pillbox.addClass("chip "+ correctness);
    $pillbox.attr("id", "guess-" + noun);
    $("#activity-stream").prepend($pillbox);
  });

  detachListener(userSceneNounsChangedRef);
  userSceneNounsChangedRef = firebase.database().ref('/users/' + uid + '/scenes/' + scene + '/nouns');
  userSceneNounsChangedRef.on('child_changed', function(snapshot) {
    var $pillbox = $("#guess-" + snapshot.key)
    $pillbox.removeClass();
    $pillbox.addClass("chip " + snapshot.val());
  });

  detachListener(userSceneNounsProgressAddedRef);
  userSceneNounsProgressAddedRef = firebase.database().ref('/users/' + uid + '/scenes/' + scene + '/in_progress');
  userSceneNounsProgressAddedRef.on('child_added', function(snapshot, prevChildKey) {
    console.log('child added: ', snapshot.key)
    var $loader = $('<span class="chip">' +
      '<img src="/images/progress_spinner_googblue_20dp.gif" ' +
      'height="13.9" style="margin-left:15px; margin-right:15px"/>' +
      '</span>');
    $loader.attr("id", "loader-" + snapshot.key);
    $("#activity-stream").prepend($loader);
  });

  detachListener(userSceneNounsProgressRemovedRef);
  userSceneNounsProgressRemovedRef = firebase.database().ref('/users/' + uid + '/scenes/' + scene + '/in_progress');
  userSceneNounsProgressRemovedRef.on('child_removed', function(snapshot) {
    $('#loader-' + snapshot.key).hide();
    console.log('child removed: ', snapshot.key)
  }); 
}

function showToast(message) {
  let snackbar = document.querySelector('.mdl-js-snackbar');
  snackbar.MaterialSnackbar.showSnackbar({message: message});
}

function initDisplay() {
  // Setup listener to show notification when scene changes and remove guesses
  firebase.database().ref('/admin/current_scene').on('value', function(snapshot) {
    if (scene !== snapshot.val()) {
      scene = snapshot.val();
      console.log('Scene changed to: ' + scene);
      $("#activity-stream").empty();
      showGuesses();
      showMetrics();
      showToast(`Current scene is "${scene}"`);
    } 
   });
  }

function addTypedGuess() {
  if (!gameActive) {
    alert('Round over, cannot submit more guesses.');
    return;
  }
  // Write the guessed noun (trimmed) to the list of guesses
  let noun = $.trim($('#noun').val().toLowerCase());

  console.log(noun);
  $('#noun').val("");
  // Starts with value "maybe...", gets updated to true or false when the guess has been validated.
  return firebase.database().ref('/users/' + uid + '/scenes/' + scene + '/nouns/' + noun).set("maybe...");
}

function initLanguages() {
  $('#lang-display').text(lang);
  $("#lang-picker").empty();
  var options = ''
  for (var i = 0; i < availableLangs.length; i++){
    var name = availableLangs[i];
    options += '<option value="'+ langToCode[name] + '"';
    options += langCode === langToCode[name] ? (' selected="selected"') : '';
    options += '>' + name + '</option>';
  }
  $('#lang-picker').append(options);

  firebase.database().ref('users/' + uid + '/lang').once('value').then(function(snapshot) {
    if (snapshot.val()) {
      lang = snapshot.val().name;
      langCode = snapshot.val().code;
      $('#lang-display').text(lang);
    } else {
      $('#lang-display').text('English');
    }
  });

  $('#submit-lang').click(handleLangSelection);
  $('#change-lang').click(function() {
    $('#lang-picker-container').toggle();
    $('#input-container').toggle();
  });
}

function initApp() {
  firebase.database().ref('/admin/active').on('value', function(snapshot) {
    gameActive = snapshot.val();
  });

  $('#sign-out').click(function() {
    firebase.auth().signOut();
  });

  initTalkBtn();

  $('#guess-btn').click(addTypedGuess);
  $('input#noun').keypress(function (e) {
    if (e.which == 13) {
      addTypedGuess();
      return false;
    }
  });
};

$(document).ready(function() {
  firebase.auth().onAuthStateChanged(function(user) {
    if (user && user.uid == uid) {
      return;
    }
    user ? handleSignedInUser(user) : handleSignedOutUser();
  });

  initApp();
});
