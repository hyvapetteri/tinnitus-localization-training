angular.module('ttControllers')
    .controller('welcomeCtrl', ['$scope', 'hoodieStore', '$uibModal', '$location',
    function($scope, hoodieStore, $uibModal, $location) {

  $scope.listSessions = function() {
    hoodieStore.findAll(function(obj) {
      return ((obj.type == 'session') && (obj.id !== $scope.session_key));
    }).then(function(sessions) {
      $scope.sessions = sessions;
    });
  }

  $scope.listSessions();

  hoodieStore.on('session:change', function(event, session) {
    $scope.listSessions();
  });

  $scope.startNewSession = function() {
    var mode = 'training';
    if (!($scope.settings)) {
      mode = 'baseline';
    }
    hoodieStore.add('session', {
      stage: 'vas',
      preparations: 'unfinished',
      mode: mode
    }).then(function(session) {
      return hoodieStore.updateOrAdd('session-key','current', {key: session.id});
    }).then(function() {
      $location.path('/vas');
    }).catch(function(err) {
      console.log(err);
    });
  }

  $scope.finishSession = function() {
    hoodieStore.update('session-key','current', {key: ''}).then(function() {
      $scope.listSessions();
    });
  }

  $scope.startNewExercise = function () {

    var modalInstance = $uibModal.open({
      templateUrl: 'exerciseModal.html',
      scope: $scope,
      controller: ['$scope','$uibModalInstance','$state', '$location', 'hoodieStore',
                  function($scope, $uibModalInstance, $state, $location, hoodieStore) {

        $scope.exerciseDifficultySetting = 'easy';

        $scope.ok = function() {
          $uibModalInstance.close();

          var stage = 'vas';
          if ($scope.currentsession.preparations == 'done') {
            stage = 'training';
          }

          hoodieStore.update('session', $scope.session_key, {
            'active_exercise': {'difficulty': $scope.exerciseDifficultySetting},
            'stage': stage
          }).then(function() {
            $location.path('/'+stage);
          });
        }

        $scope.cancel = function() {
          $uibModalInstance.dismiss('cancel');
        }
      }]
    });

  } // $scope.startNewExercise

}]);
