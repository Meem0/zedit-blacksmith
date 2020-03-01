ngapp.directive('editWnam', function(elementSchemaService) {
    let editWnamLink = function(scope) {
        if (!scope.model) {
            scope.model = {};
        }
        elementSchemaService.process(scope.model, 'wnamSchema', {inPlace: true});

        scope.$watch('editorIdBasedOn', function() {
            scope.model['EDID - Editor ID'] = '1st' + scope.editorIdBasedOn;
        });
    };

    return {
        restrict: 'E',
        scope: {
            model: '=',
            editorIdBasedOn: '<'
        },
        templateUrl: `${modulePath}/partials/editWnam.html`,
        link: editWnamLink
    }
});
