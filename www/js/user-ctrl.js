angular.module('ttControllers')
    .controller('UserController', ['$scope', '$rootScope', 'hoodieAccount',
    '$location', 'hoodieStore', '$window',
    function($scope, $rootScope, hoodieAccount, $location, hoodieStore, $window) {

  $scope.account = hoodieAccount;

  $scope.accountAction = {
    logout: function() {
      //console.log('logout')
      return hoodieAccount.signOut().then(function() {
        $scope.account = null;
        $location.path('/welcome');
      }).catch(function(err) {
        console.log('error logging out: ' + err);
      });
    }
  };

  $scope.onExit = function(event) {
    return "All data will be lost!";
  };

  $window.onbeforeunload =  $scope.onExit;

  //$scope.currentsession = hoodieObject.bind('session','current');


  hoodieStore.find('session-key', 'current').then(function(session_key) {
    $scope.session_key = session_key.key;
    hoodieStore.find('session', session_key.key).then(function(session) {
      $scope.currentsession = session;
    });
  });

  hoodieStore.on('session-key:current:change', function(event, session_key) {
    //console.log(event);
    if (event == 'remove') {
      delete $scope.session_key;
      console.log('deleting currentsession from scope');
      delete $scope.currentsession;
    } else {
      $scope.session_key = session_key.key;
      if (session_key.key == '') {
        delete $scope.currentsession;
        return;
      }
      hoodieStore.find('session', session_key.key).then(function(session) {
        $scope.currentsession = session;
      });
    }
  });

  hoodieStore.on('session:change', function(event, session) {
    if (session.id == $scope.session_key) {
      $scope.currentsession = session;
    }
  });

  hoodieStore.find('settings','parameters').then(function(settings) {
    $scope.settings = settings;
  });

  hoodieStore.on('settings:parameters:change', function(event, settings) {
    $scope.settings = settings;
  });

  hoodieAccount.on('signin', function() {
    $scope.account = hoodieAccount;
  });
  hoodieAccount.on('signout', function() {
    $scope.account = null;
    delete $scope.currentsession;
  });
  hoodieAccount.on('error:unauthenticated', function(err, username) {
    $scope.account = null;
    delete $scope.currentsession;
    delete $scope.session_key;
    $location.path('/login');
  })

}]);
