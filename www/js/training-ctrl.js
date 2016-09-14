angular.module('ttControllers')
    .controller('trainingCtrl',
    ['$scope', '$window', 'utils', 'webaudiocontext', 'hoodieStore', '$uibModal',
    function($scope, $window, utils, webaudiocontext, hoodieStore, $uibModal) {

  'use strict';

  var audioCtx = webaudiocontext;
  //$scope.audiostatus = audioCtx.state;
  var active_exercise = {};
  if ('active_exercise' in $scope.currentsession) {
    active_exercise = $scope.currentsession.active_exercise;
  }

  if ($scope.currentsession.mode == 'baseline') {
    if (!('f1_baseline_jnd' in $scope.currentsession)) {
      $scope.which_freq = 'f1';
    } else if (!('f2_baseline_jnd' in $scope.currentsession)) {
      $scope.which_freq = 'f2';
    }
  } else {
    $scope.which_freq = 'f2';
  }

  $scope.freq = $scope.currentsession[$scope.which_freq];
  $scope.gain = $scope.currentsession['th_' + $scope.which_freq] * utils.dbtoa(50);
  var training_history = [];

  var fs = audioCtx.sampleRate;
  var len_s = 0.5;
  var len_pause = 0.2;
  var nSamples = fs * (2 * len_s + len_pause);
  var buffer = audioCtx.createBuffer(2, nSamples, fs);
  //var angle = Math.random() * 80.0 - 40.0;
  var angle = 0.0;
  var shift = 60.0;
  if ($scope.currentsession.mode == 'training') {
    var jnd = $scope.settings[$scope.which_freq + '_baseline_jnd'];
    if (active_exercise.difficulty == 'easy') {
      shift = jnd + 30;
    } else if (active_exercise.difficulty == 'medium') {
      shift = jnd + 10;
    } else if (active_exercise.difficulty == 'hard') {
      shift = jnd;
    }
  }
  var ans_hist = [null,null,null];

  $scope.counter = 0;
  $scope.correct_counter = 0;
  var turns = [];
  var turn_counter = 0;
  var previous_update = 'init';
  $scope.progressstyle = {'width': '0%'};
  $scope.direction = 0;
  $scope.msg = 'Click \x27Play\x27 or press spacebar for next sound';
  //var itd_s = 0.001;
  //var itd_samples = fs * lag_s;

  function update_location() {
    //angle = Math.random() * 10.0 - 5.0; // from -5° (left) to +5° (right)
    var abs_shift = Math.abs(shift);
    if ($scope.currentsession.mode == 'baseline') {
      if ((previous_update == 'init') && (ans_hist[ans_hist.length - 1] == 'corr')) {
        abs_shift *= 0.5;
      }
      if (ans_hist.every(a => a == 'corr')) {
        if (previous_update == 'up') {
          turn_counter++;
          turns.push(abs_shift);
        }
        ans_hist = [null,null,null];
        abs_shift *= 0.5;
        previous_update = 'down';
      } else if (ans_hist[ans_hist.length - 1] == 'wrong') {
        if (previous_update == 'down') {
          turn_counter++;
          turns.push(abs_shift);
        }
        abs_shift *= 2.0;
        previous_update = 'up';
      }
    }

    var rnd = Math.random();
    if (rnd < 0.5) {
      shift = abs_shift;
      $scope.direction = 'right';
    } else {
      shift = -1 * abs_shift;
      $scope.direction = 'left';
    }
  }

  $scope.correct = undefined;
  $scope.answer_disabled = true;
  $scope.play_disabled = false;

  $scope.check_answer = function(ans) {
    $scope.counter++;

    $scope.correct = (ans == $scope.direction);
    if ($scope.correct) {
      $scope.correct_counter += 1;
    }

    ans_hist.shift(); // discard first element
    ans_hist.push($scope.correct?'corr':'wrong'); // add new to the end

    training_history.push({
      'counter': $scope.counter,
      'correct': $scope.correct,
      'answer': ans,
      'angle': angle,
      'shift': shift,
      'direction': $scope.direction
    });

    active_exercise[$scope.currentsession.mode + '_' + $scope.which_freq + '_record'] = training_history;
    hoodieStore.update('session', $scope.session_key, {
      'active_exercise': active_exercise
    }).then(function() {
      $scope.msg = '';
      if ($scope.currentsession.mode == 'training') {
        $scope.progressstyle = {'width': '' + (($scope.counter*100)/50) + '%'};
      } else if ($scope.currentsession.mode == 'baseline') {
        $scope.progressstyle = {'width': '' + ((turn_counter * 100)/20) + '%'};
      }
      $scope.answer_disabled = true;
      $scope.play_disabled = false;
      $scope.direction = 0;
    });

    if (($scope.currentsession.mode == 'training') && ($scope.counter == 50)) {
      $scope.play_disabled = true;
      $scope.answer_disabled = true;
      var exercises = [];
      if ('exercises' in $scope.currentsession) {
        angular.copy($scope.currentsession.exercises, exercises);
      }
      active_exercise['correct_counter'] = $scope.correct_counter;
      exercises.push(active_exercise);
      hoodieStore.update('session', $scope.session_key, {
        'active_exercise': {},
        'exercises': exercises
      }).then(function() {
        $scope.openModal();
      });
    } else if (($scope.currentsession.mode == 'baseline') && (turn_counter == 20)) {
      $scope.play_disabled = true;
      $scope.answer_disabled = true;
      var baseline = 0.0;
      for (var i = 0; i < 20; i++) {
        baseline += turns[i];
      }
      baseline /= 20.0;
      var tmp = {};
      angular.copy($scope.currentsession, tmp);
      tmp[$scope.which_freq + '_baseline_jnd'] = baseline;
      active_exercise[$scope.which_freq + '_baseline_jnd'] = baseline;
      active_exercise[$scope.which_freq + '_baseline_turns'] = turns;
      var exercises = [];
      if ('exercises' in $scope.currentsession) {
        angular.copy($scope.currentsession.exercises, exercises);
      }
      exercises.push(active_exercise);
      tmp.active_exercise = {};
      tmp['exercises'] = exercises;
      hoodieStore.update('session', $scope.session_key, tmp).then(function() {
        $scope.openModal();
      });
    }

    //console.log('done checking');
    //update_location();
  }

  $scope.play = function() {
    update_location();

    //console.log('play');
    $scope.msg = 'Listen';
    $scope.play_disabled = true;
    //$('#msg').html('Playing');
    var stimulus = utils.pink_noise(nSamples);

    /*
    // sin-cos law
    l_gain = Math.cos(((90.0 + angle)/180.0) * (Math.PI/2));
    l_gain_2 = Math.cos(((90.0 + angle + shift)/180.0) * (Math.PI/2));
    r_gain = Math.sin(((90.0 + angle)/180.0) * (Math.PI/2));
    r_gain_2 = Math.sin(((90.0 + angle + shift)/180.0) * (Math.PI/2));
    */


    // ITD

    /*
    if (itd_samples > 0) {
      var leading_output = buffer.getChannelData(1); // R
      var lagging_output = buffer.getChannelData(0); // L
    }
    else {
      var leading_output = buffer.getChannelData(0); // L
      var lagging_output = buffer.getChannelData(1); // R
    }

    for (var i = 0; i < itd_samples; i++) {
      leading_output[i] = stimulus[i];
      lagging_output[i] = 0.0;
    }
    for (var i = itd_samples; i < fs * len_s; i++) {
      leading_output[i] = stimulus[i];
      lagging_output[i] = stimulus[i - itd_samples];
    }
    for (var i = fs*len_s; i < fs*len_s + itd_samples; i++) {
      leading_output[i] = 0.0;
      lagging_output[i] = stimulus[i - itd_samples];
    }
    for (var i = fs*len_s + itd_samples; i < fs * (len_s + len_pause); i++) {
      leading_output[i] = 0;
      lagging_output[i] = 0;
    }
    // recalculate ITD and do same again
    var new_itd_s = itd_s + d_itd;
    var new_itd_samples = new_itd_s * fs;

    if (Math.sign(new_itd_samples) !== Math.sign(itd_samples)) {
      var tmp = leading_output;
      var leading_output = lagging_output;
      var lagging_output = tmp;
    }

    var halfway = fs * (len_s + len_pause);
    for (var i = halfway; i < halfway + new_itd_samples; i++) {
      leading_output[i] = stimulus[i];
      lagging_output[i] = 0.0;
    }
    for (var i = halfway + new_itd_samples; i < halfway + fs * len_s; i++) {
      leading_output[i] = stimulus[i];
      lagging_output[i] = stimulus[i - new_itd_samples];
    }
    for (var i = fs*len_s; i < fs*len_s + new_itd_samples; i++) {
      leading_output[i] = 0.0;
      lagging_output[i] = stimulus[i - new_itd_samples];
    }
    for (var i = fs*len_s + new_itd_samples; i < fs * (len_s + len_pause); i++) {
      leading_output[i] = 0;
      lagging_output[i] = 0;
    }
    */
    // ILD
    // square root law
    var l_gain = Math.sqrt(1 - (90.0 + angle)/180.0);
    var l_gain_2 = Math.sqrt(1 - (90.0 + angle + shift)/180.0);
    var r_gain = Math.sqrt((90.0 + angle)/180.0);
    var r_gain_2 = Math.sqrt((90.0 + angle + shift)/180.0);

    var l_output = buffer.getChannelData(0);
    var r_output = buffer.getChannelData(1);

    for (var i = 0; i < fs * len_s; i++) {
      l_output[i] = stimulus[i] * l_gain;
      r_output[i] = stimulus[i] * r_gain;
    }

    for (var i = fs * len_s; i < fs * (len_s + len_pause); i++) {
      l_output[i] = stimulus[i] * 0;
      r_output[i] = stimulus[i] * 0;
    }

    for (var i = fs * (len_s + len_pause); i < nSamples; i++) {
      l_output[i] = stimulus[i] * l_gain_2;
      r_output[i] = stimulus[i] * r_gain_2;
    }

//buffer.copyToChannel(stimulus.map(function(x) x * l_gain), 0);
//buffer.copyToChannel(stimulus.map(function(x) x * r_gain), 1);

    var bqf1 = audioCtx.createBiquadFilter();
    bqf1.type = 'bandpass';
    bqf1.frequency.value = $scope.freq;
    bqf1.Q.value = 6;

    var bqf2 = audioCtx.createBiquadFilter();
    bqf2.type = 'bandpass';
    bqf2.frequency.value = $scope.freq;
    bqf2.Q.value = 6;

    var bqf3 = audioCtx.createBiquadFilter();
    bqf3.type = 'bandpass';
    bqf3.frequency.value = $scope.freq;
    bqf3.Q.value = 10;

    var gainNode = audioCtx.createGain();
    gainNode.gain.value = $scope.gain;

    var src = audioCtx.createBufferSource();
    src.buffer = buffer;
    src.onended = function() {
      $scope.$apply(function() {
        gainNode.disconnect(audioCtx.destination);
        //console.log('ended!');
        // enable answering
        $scope.msg = 'Did the sound move to the left or to the right?';
        $scope.answer_disabled = false;
        //$('#playBtn').prop('disabled',false);
      });
    }
    src.connect(bqf1);
    bqf1.connect(bqf2);
    bqf2.connect(bqf3);
    bqf3.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    src.start();

    //console.log('start src ' + buffer.getChannelData(0).length);
    $scope.audiostatus = audioCtx.state;
  }

  angular.element($window).bind('keydown', function(e) {
    //console.log('keypress ' + e.key);
    // up: 38, down: 40 , left: 37, right: 39
    switch (e.keyCode) {
    case 32: // spacebar
      // play sound, disable keys
      if ($scope.play_disabled) {
        return;
      }
      $scope.play_disabled = true;
      $scope.play();
      break;
    case 37: // left
      if ($scope.answer_disabled) {
        return;
      }
      //console.log('checking left');
      $scope.check_answer('left');
      break;
    case 39: // right
      if ($scope.answer_disabled) {
        return;
      }
      $scope.check_answer('right');
      break;
    }
    $scope.$apply();
  });

  //$('#counter').html('Trial ' +counter + '/50');

  $scope.$on('$destroy', function() {
    angular.element($window).unbind('keypress');
  });

  $scope.openModal = function () {

    var modalInstance = $uibModal.open({
      templateUrl: 'finishedModal.html',
      scope: $scope,
      controller: ['$scope','$uibModalInstance','$state', '$location', 'hoodieStore',
                  function($scope, $uibModalInstance, $state, $location, hoodieStore) {
        $scope.ok = function() {
          $uibModalInstance.close();
          if ($scope.currentsession.mode == 'baseline' && $scope.which_freq == 'f1') {
            $state.reload();
          } else if ($scope.currentsession.mode == 'baseline' && $scope.which_freq == 'f2') {
            hoodieStore.add('settings', 'parameters', {
              f1_baseline_jnd: $scope.currentsession.f1_baseline_jnd,
              f2_baseline_jnd: $scope.currentsession.f2_baseline_jnd,
              f1: $scope.currentsession.f1,
              f2: $scope.currentsession.f2
            }).then(function() {
              return hoodieStore.update('session', $scope.session_key, {
                stage: 'finished'
              });
            }).then(function(session) {
                return hoodieStore.update('session-key','current', {key: ''});
            }).then(function() {
              $location.path('/welcome');
            }).catch(function(err) {
              console.log('error: ' + err);
            });
          } else {
            hoodieStore.update('session', $scope.session_key, {
              stage: 'finished'
            }).then(function() {
              $location.path('/welcome');
            });
          }
        }

        $scope.cancel = function() {
          $uibModalInstance.dismiss('cancel');
        }
      }]
    });
  }

}]);
