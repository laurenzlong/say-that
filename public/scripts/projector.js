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
var scene = null;
var summaryPopulated = false;

var showScore = function() {
  console.log(`Scene: ${scene}`);
  firebase.database().ref('/total_scores/' + scene).on('value', function(snapshot) {
    console.log('got score: ', snapshot.val())
    if (snapshot.val()) {
      $('#total-score').text(snapshot.val());
    }
  });
};

var showLangs = function() {
  firebase.database().ref('/total_langs/' + scene + '/numLanguages').on('value', function(snapshot) {
    if (snapshot.val()) {
      $('#total-langs').text(snapshot.val());
    }
  });
};

var addStreamItem = function(noun, correctness) {
  var $streamItem = $([
    '<span class=\"chip '+ correctness +'\">',
    noun,
    '</span>'
  ].join('\n'));

  // Prepend results and only keep 30 of the newest
  $('#activity-stream').prepend($streamItem);
  if ($("#activity-stream").children().length > 30) {
    $("#activity-stream").children().slice(30).remove();
  }
}

var showActivityStream = function() {
  firebase.database().ref('/all_guesses/' +scene).on('child_added', function(snapshot) {
    addStreamItem(snapshot.val().original, snapshot.val().correctness);
  });
};

var initSummaryDialog = function() {
  var dialog = document.querySelector('dialog');
  var showDialogButton = $('#show-dialog');
  if (! dialog.showModal) {
    dialogPolyfill.registerDialog(dialog);
  }
  showDialogButton.click(function() {
    populateSummary();
    dialog.showModal();
    firebase.database().ref('/admin/active').set(false);
  });
  $('dialog .close').click(function() {
    $('table#summary-table tbody').empty();
    summaryPopulated = false;
    dialog.close();
    firebase.database().ref('/admin/active').set(true);
  });
};

var populateSummary = function() {
  if (summaryPopulated) { return; }
  summaryPopulated = true;

  firebase.database().ref('/summary/' + scene).once('value').then(function(snapshot) {
    var results = snapshot.val();
    for (noun in results) {
      if (results.hasOwnProperty(noun)) {
        var nounSummary = results[noun];
        var langCount = nounSummary.num_langs || 0;
        var nounScore = nounSummary.score || 0;
        $row = $('<tr><td class=noun>' + noun + '</td><td>' +
          nounScore +'</td><td>' +
          langCount + '</td></tr>');
        $('table#summary-table tbody').append($row);
      }
    }
  });
}

var showVideo = function() {
  var $video = $([
    '<video id="video-player" width="96%" controls>',
    '<source src="/videos/' + scene + '.mp4" type="video/mp4">',
    '</video>'
  ].join('\n'));
  $('#activity-stream').empty();
  $('#video-container').empty();
  $('#video-container').append($video);
};

var initSceneSelector = function(initialScene) {
  firebase.database().ref('/admin/scenes').once('value').then(function(snapshot) {
    $('#scene-selector').empty();
    var scenes = snapshot.val();
    for (key in scenes) {
      if (scenes.hasOwnProperty(key)) {
        var $choice = $('<option value="' + key + '" ' + (key === initialScene ? 'selected' : '') + '>' + key + '</option>');
        $('#scene-selector').append($choice);
      }
    }
    $('#scene-select-submit').click(function() {
      firebase.database().ref('/admin/current_scene').set($('#scene-selector').val());
    });
  })
};

$(document).ready(function() {
  firebase.database().ref('/admin/current_scene').on('value', function(snapshot) {
    scene = snapshot.val();
    showVideo();
    showScore();
    showLangs();
    showActivityStream();
    initSceneSelector(scene);
    initSummaryDialog();
    firebase.database().ref('/admin/active').set(true);
  });
});
