angular.module('ttControllers')
    .controller('matchingCtrl', ['$scope', 'utils', 'webaudiocontext', 'hoodieStore', '$location',
    function($scope, utils, webaudiocontext, hoodieStore, $location) {

  var audioCtx = webaudiocontext;

  var fs = audioCtx.sampleRate;
  var freq = Math.random() * 5500.0 + 500.0;
  var gain = utils.dbtoa(Math.random() * 20.0 - 40.0);

  $scope.f_dial = 0;
  $scope.g_dial = 0;

  function reset_audio() {
    //console.log('Reset audio');
    freq = Math.random() * 5500.0 + 500.0;
    gain = utils.dbtoa(Math.random() * 20.0 - 40.0);
    osc.frequency.value = freq;
    filter.frequency.value = freq;
    gainNode.gain.value = gain;
    $scope.f_dial = 0;
    $scope.g_dial = 0;
    prev_f_dial = 0;
    prev_g_dial = 0;
  }

  /*
    1: osc -> stereo pan -> gain
    2: buffer -> buffer source -> biquad filter -> stereo pan -> gain
  */

  var osc = audioCtx.createOscillator();
  var gainNode = audioCtx.createGain();
  var panner = audioCtx.createStereoPanner();
  panner.pan.value = 0.0;

  osc.type = 'sine';
  osc.frequency.value = freq;

  osc.connect(panner);
  panner.connect(gainNode);
  gainNode.gain.value = gain;
  gainNode.connect(audioCtx.destination);

  var noiseSamples = 2*fs;
  var buff = audioCtx.createBuffer(1, noiseSamples, fs);
  var noise = utils.white_noise(noiseSamples);
  buff.copyToChannel(noise, 0);
  var src = audioCtx.createBufferSource();
  src.buffer = buff;
  src.loop = true;

  var filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = 3.0;

  src.connect(filter);

  var prev_f_dial = 0;
  var f_knob_multiplier = 1.5;

  $scope.$watch('f_dial', function() {
    if ((prev_f_dial - $scope.f_dial) > 50 && osc.frequency.value < 20000.0) {
      freq *= f_knob_multiplier;
    }
    if ((prev_f_dial - $scope.f_dial) < -50 && osc.frequency.value > 20.0) {
      freq /= f_knob_multiplier;
    }
    f_tmp = freq * Math.pow(f_knob_multiplier, $scope.f_dial/100.0);
    if (f_tmp > 20000.0) {
      f_tmp = 20000.0;
    } else if (f_tmp < 20.0) {
      f_tmp = 20.0;
    }
    osc.frequency.value = f_tmp;
    filter.frequency.value = f_tmp;
    prev_f_dial = $scope.f_dial;

    //$('#fval').html(osc.frequency.value);
  });

  var prev_g_dial = 0;
  var g_knob_multiplier = 4.0;

  $scope.$watch('g_dial', function(val) {
    if ((prev_g_dial - $scope.g_dial) > 50 && gainNode.gain.value < utils.dbtoa(80.0)) {
      gain *= g_knob_multiplier;
    }
    if ((prev_g_dial - $scope.g_dial) < -50) {
      gain /= g_knob_multiplier;
    }
    g_tmp = gain * Math.pow(g_knob_multiplier, $scope.g_dial/100.0);
    if (g_tmp > utils.dbtoa(80)) {
      g_tmp = utils.dbtoa(80);
    } else if (g_tmp < utils.dbtoa(-80.0)) {
      g_tmp = utils.dbtoa(-80.0);
    }
    gainNode.gain.value = g_tmp;
    prev_g_dial = $scope.g_dial;

    //$('#gval').html(gainNode.gain.value);
  });

  $scope.playing = 'init';
  $scope.buttonTxt = '&#9658; Play';

  $scope.play = function() {
    //console.log('playy');
    //console.log(audioCtx.state);
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    if ($scope.playing == 'init') {
      osc.start();
      src.start();
      $scope.buttonTxt = 'Mute';
      $scope.playing = 'playing';
    } else if ($scope.playing == 'paused') {
      gainNode.connect(audioCtx.destination);
      $scope.buttonTxt = 'Mute';
      $scope.playing = 'playing';
    } else if ($scope.playing == 'playing') {
      gainNode.disconnect(audioCtx.destination);
      $scope.buttonTxt = '&#9658; Play';
      $scope.playing = 'paused';
    }
  }

  $scope.bal = 0.0;
  $scope.$watch('bal', function() {
    panner.pan.value = $scope.bal;
  });

  $scope.sound = 'tone';
  $scope.$watch('sound', function() {
    if ($scope.sound == 'noise') {
      osc.disconnect(panner);
      filter.connect(panner);
    } else if ($scope.sound == 'tone') {
      try {
        filter.disconnect(panner);
      } catch(err) {
        // just catch it
      }
      osc.connect(panner);
    }
    reset_audio();
  });

  $scope.q_dial = 1.0;
  $scope.$watch('q_dial', function() {
    filter.Q.value = Math.pow(10, $scope.q_dial) * 3;
  });

  $scope.$on('$destroy', function() {
    try {
      gainNode.disconnect(audioCtx.destination);
    } catch(err) {
      // it's okay
    }
    if ($scope.playing !== 'init') {
      osc.stop();
      src.stop();
      //audioCtx.suspend();
    }
  });

  $scope.matchCounter = 1;
  $scope.tmpTinnitusMatches = [];
  $scope.ready = function() {

    $scope.tmpTinnitusMatches.push({
      freq: osc.frequency.value,
      gain: gainNode.gain.value,
      Q: filter.Q.value,
      type: $scope.sound,
      pan: $scope.bal
    });

    $scope.matchCounter += 1;

    var currentStage = ($scope.matchCounter > 3)?'threshold':'matching';

    if ($scope.matchCounter <= 3) {
      hoodieStore.update('session', $scope.session_key, {
        tinnitusMatches: $scope.tmpTinnitusMatches,
        stage: currentStage
      }).then(function() {
        console.log('updated session')
        reset_audio();
      }).catch(function(err) {
        console.log('errorrr ' + err);
      });
    } else {
      console.log('four matches, going forward');
      var avg_match = null;
      for (i = 0; i < 3; i++) {
        avg_match += $scope.tmpTinnitusMatches[i].freq;
      }
      avg_match /= 3.0;

      hoodieStore.update('session', $scope.session_key, {
        tinnitusMatches: $scope.tmpTinnitusMatches,
        stage: currentStage,
        f1: 1000,
        f2: avg_match
      }).then(function() {
        $location.path('/threshold');
      });
    }

  }

}]);
