angular.module('ttControllers')
    .controller('SignupController', ['$scope', '$location', 'hoodieAccount',
    function($scope, $location, hoodieAccount) {

  $scope.processSignup = function(signupinfo) {
    if (!$scope.signupForm.$valid) {
      console.log('invalid form');
      return;
    }
    return hoodieAccount.signUp(signupinfo.username, signupinfo.password).then(function() {
      $location.path('/info');
    }).catch(function(err) {
      $scope.signupForm.$error.message = err.message;
    });
  }
}]);
