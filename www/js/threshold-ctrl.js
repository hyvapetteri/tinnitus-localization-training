angular.module('ttControllers')
    .controller('thresholdCtrl',
    ['$scope', '$interval', 'utils', 'webaudiocontext', 'hoodieStore', '$location', '$state', '$uibModal',
    function($scope, $interval, utils, webaudiocontext, hoodieStore, $location, $state, $uibModal) {

  var audioCtx = webaudiocontext;
  var fs = audioCtx.sampleRate;

  var volume = utils.dbtoa(-50);

  var noiseSamples = 2*fs;
  var buff = audioCtx.createBuffer(1, noiseSamples, fs);
  var noise = utils.pink_noise(noiseSamples);
  buff.copyToChannel(noise, 0);
  var src = audioCtx.createBufferSource();
  src.buffer = buff;
  src.loop = true;

  var bqf1 = audioCtx.createBiquadFilter();
  bqf1.type = 'bandpass';
  bqf1.Q.value = 6;

  var bqf2 = audioCtx.createBiquadFilter();
  bqf2.type = 'bandpass';
  bqf2.Q.value = 6;

  var bqf3 = audioCtx.createBiquadFilter();
  bqf3.type = 'bandpass';
  bqf3.Q.value = 10;

  var gainNode = audioCtx.createGain();
  gainNode.gain.value = volume;

  src.connect(bqf1);
  bqf1.connect(bqf2);
  bqf2.connect(bqf3);
  bqf3.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  //src.start();

  $scope.audiostatus = audioCtx.state;

  //osc.type = 'sine';

  var direction = 1; // -1 or 1, down or up
  var intervalPointer = null;
  $scope.turns = [];
  $scope.reversed_counter = 0;
  $scope.frequency = '';
  $scope.progressstyle = {'width': '0%'};

  var freq = null;
  if (!('th_f1' in $scope.currentsession)) {
    freq = $scope.currentsession.f1;
    $scope.frequency = 'f1';
  } else if (!('th_f2' in $scope.currentsession)) {
    freq = $scope.currentsession.f2;
    $scope.frequency = 'f2';
  } else {
    hoodieStore.update('session', $scope.session_key, {
      stage: 'training'
    }).then(function() {
      $location.path('/training');
    });
  }
  bqf1.frequency.value = freq;
  bqf2.frequency.value = freq;
  bqf3.frequency.value = freq;

  function update_volume() {
    volume *= utils.dbtoa(direction*0.3);
    gainNode.gain.value = volume;
  }

  $scope.playing = 'init';
  $scope.buttonTxt = '&#9658; Play';

  $scope.play = function() {
    if ($scope.playing == 'init') {
      src.start();
      intervalPointer = $interval(update_volume, 100);
      $scope.buttonTxt = 'Mute';
      $scope.playing = 'playing';
    } else if ($scope.playing == 'paused') {
      gainNode.connect(audioCtx.destination);
      intervalPointer = $interval(update_volume, 100);
      $scope.buttonTxt = 'Mute';
      $scope.playing = 'playing';
    } else if ($scope.playing == 'playing') {
      gainNode.disconnect(audioCtx.destination);
      $interval.cancel(intervalPointer);
      $scope.buttonTxt = '&#9658; Play';
      $scope.playing = 'paused';
    }
  }

  $scope.press = function() {
    direction = -1;
    $scope.turns.push(gainNode.gain.value);
  }

  $scope.release = function() {
    direction = 1;
    $scope.reversed_counter += 1;
    $scope.progressstyle = {'width': '' + (($scope.reversed_counter*100)/10) + '%'};
    $scope.turns.push(gainNode.gain.value);
    if ($scope.reversed_counter == 10) {
      var avg_th = 0;
      for (var i = 4; i < 20; i++) {
        avg_th += $scope.turns[i];
      }
      avg_th /= 16.0;

      src.stop();
      gainNode.disconnect(audioCtx.destination);
      $interval.cancel(intervalPointer);

      $scope.openModal(avg_th);
    }
  }

  $scope.openModal = function(avg_th) {
    var modalInstance = $uibModal.open({
      templateUrl: 'finishedModal.html',
      scope: $scope,
      controller: ['$scope','$uibModalInstance','$state', '$location', 'hoodieStore',
                  function($scope, $uibModalInstance, $state, $location, hoodieStore) {

        $scope.ok = function() {
          $uibModalInstance.close();
          if ($scope.frequency == 'f1') {
            hoodieStore.update('session', $scope.session_key, {
              th_f1: avg_th,
              f1_turns: $scope.turns
            }).then(function() {
              $state.reload();
            });
          } else if ($scope.frequency == 'f2') {
            hoodieStore.update('session', $scope.session_key, {
              th_f2: avg_th,
              f2_turns: $scope.turns,
              preparations: 'done',
              stage: 'training'
            }).then(function() {
              if ($scope.currentsession.mode == 'training') {
                $location.path('/welcome');
              } else {
                $location.path('/training');
              }
            });
          }
        }
      }]
    });
  }

  $scope.$on('$destroy', function() {
    //audioCtx.close();
    try {
      src.stop();
      gainNode.disconnect(audioCtx.destination);
      $interval.cancel(intervalPointer);
    } catch (err) {
      // no worries
    }
  });
}]);
