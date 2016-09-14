angular.module('ttControllers')
    .controller('soundcheckCtrl',
    ['$scope', 'utils', 'webaudiocontext', 'hoodieStore', '$location',
    function($scope, utils, webaudiocontext, hoodieStore, $location) {

  var audioCtx = webaudiocontext;

  var fs = audioCtx.sampleRate;

  var noiseSamples = 2*fs; // 2 sec
  var buff = audioCtx.createBuffer(1, noiseSamples, fs);
  var noise = utils.pink_noise(noiseSamples);
  buff.copyToChannel(noise, 0);
  var src = audioCtx.createBufferSource();
  src.buffer = buff;
  src.loop = true;

  var gainNode = audioCtx.createGain();
  gainNode.gain.value = utils.dbtoa(-20);

  src.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  $scope.audiostatus = audioCtx.state;

  $scope.playing = 'init';
  $scope.buttonTxt = '&#9658; Play';

  $scope.play = function() {
    //console.log(audioCtx.state);
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    if ($scope.playing == 'init') {
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
    $scope.audiostatus = audioCtx.state;
  }

  $scope.$on('$destroy', function() {
    if ($scope.playing !== 'init') {
      src.stop();
      //audioCtx.suspend();
    }
    try {
      gainNode.disconnect(audioCtx.destination);
    } catch(err) {
      // let it pass.
    }
  });

  $scope.ready = function() {
    hoodieStore.update('session', $scope.session_key, {
      stage: 'matching'
    }).then(function() {
      $location.path('/matching');
    });
  }

}]);
