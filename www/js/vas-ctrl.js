angular.module('ttControllers')
    .controller('vasController', ['$scope', '$location', 'hoodieStore',
    function($scope, $location, hoodieStore) {

  $scope.ready = function() {
    if (!$scope.loudnessvas || !$scope.annoyancevas) {
      return;
    } else {
      hoodieStore.update('session', $scope.session_key, {
        loudness_vas: $scope.loudnessvas,
        annoyance_vas: $scope.annoyancevas,
        stage: 'soundcheck'
      }).then(function() {
        $location.path('/soundcheck');
      });
    }
  };

}]);
