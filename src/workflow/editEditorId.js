ngapp.directive('editEditorId', function() {
    let editEditorIdLink = function(scope) {
        scope.$watch('basedOn', function() {
            if (typeof(scope.basedOn) !== 'string') return;
            scope.model = scope.basedOn.toPascalCase();
        });
    };

    return {
        restrict: 'E',
        scope: {
            model: '=',
            basedOn: '<?'
        },
        templateUrl: `${modulePath}/partials/editEditorId.html`,
        link: editEditorIdLink
    }
});
