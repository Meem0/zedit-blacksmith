ngapp.directive('editReference', function() {
    let editReferenceLink = function(scope) {
        scope.chooseExisting = {
            label: 'Choose Existing Record'
        };
        scope.defineHere = {
            label: 'Define New Record Here'
        };
        scope.editMethods = [
            scope.chooseExisting,
            scope.defineHere
        ];
    };

    return {
        link: editReferenceLink,
        restrict: 'E',
        scope: {
            model: '=',
            signature: '@'
        },
        templateUrl: `${modulePath}/partials/directives/editReference.html`,
        transclude: true
    }
});
