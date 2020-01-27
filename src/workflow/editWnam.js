ngapp.directive('editWnam', function(elementSchemaService) {
    let editWnamLink = function(scope) {
        debugger;
        if (!scope.model) {
            scope.model = {};
        }
        elementSchemaService.process(scope.model, 'wnamSchema');
        console.log(scope.model);
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
