var ttApp = angular.module('tinnitusTraining', [
  'ttControllers',
  'ui.router',
  'hoodie',
  'ui.bootstrap'
//  'ngRoute'
]);

ttApp.config(['$stateProvider', '$urlRouterProvider',
function($stateProvider, $urlRouterProvider) {

  $urlRouterProvider.otherwise('/welcome');

  $stateProvider
  .state('loggedIn', {
    abstract: true,
    template: '<ui-view/>',
    data: {
      requireLogin: true
    }
  })
  .state('loggedIn.training', {
    url: '/training',
    templateUrl: 'html/training.html',
    controller: 'trainingCtrl'
  })
  .state('loggedIn.matching', {
    url: '/matching',
    templateUrl: 'html/matching.html',
    controller: 'matchingCtrl'
  })
  .state('loggedIn.soundcheck', {
    url: '/soundcheck',
    templateUrl: 'html/soundcheck.html',
    controller: 'soundcheckCtrl'
  })
  .state('loggedIn.vas', {
    url: '/vas',
    templateUrl: 'html/vas.html',
    controller: 'vasController'
  })
  .state('loggedIn.threshold', {
    url: '/threshold',
    templateUrl: 'html/threshold.html',
    controller: 'thresholdCtrl'
  })
  .state('loggedIn.info', {
    url: '/info',
    templateUrl: 'html/userinfo.html',
    controller: 'infoController'
  })
  .state('welcome', {
    url: '/welcome',
    templateUrl: 'html/welcome.html',
    controller: 'welcomeCtrl',
    data: {
      requireLogin: false
    }
  })
  .state('login', {
    url: '/login',
    templateUrl: 'html/login.html',
    data: {
      requireLogin: false
    }
  })
  .state('signup', {
    url: '/signup',
    templateUrl: 'html/signup.html',
    data: {
      requireLogin: false
    }
  });
}]);

// ttApp.config(function(pouchDBProvider, POUCHDB_METHODS) {
//   var authMethods = {
//     login: 'qify',
//     logout: 'qify',
//     signup: 'qify',
//     getSession: 'qify',
//     getUser: 'qify',
//     changePassword: 'qify'
//   };
//   pouchDBProvider.methods = angular.extend({}, POUCHDB_METHODS, authMethods);
// });

ttApp.factory('webaudiocontext', ['$window', function($window) {
  var audioCtx = new ($window.AudioContext || $window.WebkitAudioContext)();

  return audioCtx;
}]);

ttApp.factory('utils', function() {
  function utils() {};

  utils.pink_noise = function(nSamples) {
    var b0, b1, b2, b3, b4, b5, b6;
    b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
    var stimulus = new Float32Array(nSamples);
    for (var i = 0; i < nSamples; i++) {
      var white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      stimulus[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      stimulus[i] *= 0.11; // (roughly) compensate for gain
      b6 = white * 0.115926;
    }

    return stimulus;
  }

  utils.white_noise = function(nSamples) {
    var stimulus = new Float32Array(nSamples);
    for (var i = 0; i < nSamples; i++) {
      stimulus[i] = Math.random()*2 - 1;
    }
    return stimulus;
  }

  utils.dbtoa = function(db) {
    return Math.pow(10, db/20.0);
  }

  return utils;
});

ttApp.filter('unicode', function($sce) {
  return function(val) {
    return $sce.trustAsHtml(val);
  }
});

ttApp.config(['hoodieProvider', function(hoodieProvider) {
  hoodieProvider.url('http://127.0.0.1:6007');
}]);

ttApp.constant('APP_CONSTANTS', {
  'DB_ADDRESS': 'http://127.0.0.1:6009',
  'AUTH_NOT_AUTHENTICATED': 'auth-not-authenticated',
});

ttApp.run(function($rootScope, $window, $state, hoodieAccount) {

  $rootScope.$on('$stateChangeStart', function(event, toState, toParams, fromState,
      fromParams) {
    //console.log('statechangestart');
    if (toState.data.requireLogin && angular.isUndefined(hoodieAccount.username))  {
      //console.log('prevent');
      event.preventDefault();
      $state.go('welcome');
    }

  });
});
