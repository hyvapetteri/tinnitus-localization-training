angular.module('ttControllers')
    .controller('infoController', ['$scope', 'hoodieAccount', '$location', 'hoodieStore',
    function($scope, hoodieAccount, $location, hoodieStore) {

  $scope.processInfo = function(info) {

    if (!$scope.infoForm.$valid) {
      return
    }

    return hoodieStore.updateOrAdd('userinfo', 'info', $scope.info).then(function() {
      $location.path('/welcome');
    });

  };

  $scope.info = {};
  hoodieStore.find('userinfo','info').then(function(info) {
    $scope.info = info;
  });
}]);
