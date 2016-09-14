angular.module('ttControllers')
    .controller('LoginController', ['$scope', 'hoodieAccount', '$location',
    function($scope, hoodieAccount, $location) {

  $scope.processLogin = function(username, password) {

    if (!username || !password) {
      return
    }

    return hoodieAccount.signIn(username, password).then(function() {
      $location.path('/welcome');
    }).catch(function(err) {
      $scope.loginForm.$error.message = err.message;
    });
  };
}]);
