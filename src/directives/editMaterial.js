ngapp.directive('editMaterial', function(skyrimMaterialService) {
    let editMaterialLink = function(scope) {
        scope.materials = skyrimMaterialService.getMaterials();
        if (!scope.model && scope.materials) {
            scope.model = scope.materials[0];
        }
    };

    return {
        restrict: 'E',
        scope: {
            model: '='
        },
        templateUrl: `${modulePath}/partials/directives/editMaterial.html`,
        link: editMaterialLink
    }
});
