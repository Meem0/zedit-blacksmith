ngapp.directive('editWnam', function(elementSchemaService) {
    let editWnamLink = function(scope) {
        if (!scope.model) {
            scope.model = {};
        }
        elementSchemaService.process(scope.model, 'wnamSchema');
    };

    return {
        restrict: 'E',
        scope: {
            model: '='
        },
        templateUrl: `${modulePath}/partials/editWnam.html`,
        link: editWnamLink
    }
});
