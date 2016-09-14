var ttApp = angular.module('ttControllers');

ttApp.directive('jqueryKnob', function() {
  return {
      restrict: 'A',
      require: 'ngModel',
      link: function(scope, element, attrs, ngModel) {
          $(element).knob({
            min: 0,
            max: 100,
            stopper: false,
            displayInput: false,
            thickness: 0.3,
            width: 150,
            change: function(val) {
              scope.$apply(function() {
                ngModel.$setViewValue(val);
              });
            }
          });
      }
  };
});

ttApp.directive('formAutofillFix', function ($timeout) {
  return function (scope, element, attrs) {
    element.prop('method', 'post');
    if (attrs.ngSubmit) {
      $timeout(function () {
        element
          .unbind('submit')
          .bind('submit', function (event) {
            event.preventDefault();
            $(element)
              .find('input, textarea, select')
              .trigger('input')
              .trigger('change')
              .trigger('keydown');
            scope.$apply(attrs.ngSubmit);
          });
      });
    }
  };
});

ttApp.directive('checkPassword', function() {
  return {
    require: 'ngModel',
    scope: {
      confirmPassword: '=compareTo'
    },
    link: function(scope, elm, attrs, ctrl) {
      ctrl.$validators.passwordMismatch = function(modelValue, viewValue) {
        return modelValue == scope.confirmPassword;
      }
      scope.$watch('confirmPassword', function() {
        ctrl.$validate();
      });
    }
  }
});
