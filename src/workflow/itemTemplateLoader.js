ngapp.directive('itemTemplateLoader', function(skyrimWeaponService) {
    let itemTemplateLoaderLink = function(scope) {
        let loadItemTemplate = function() {
            if (!scope.modelItemType || !scope.modelMaterial) {
                return;
            }

            let getItemAttributes;
            if (scope.itemType === 'weapon') {
                getItemAttributes = skyrimWeaponService.getWeaponAttributes;
            }

            const attributes = getItemAttributes(scope.modelItemType, scope.modelMaterial);
            Object.assign(scope.model, attributes);
        }

        scope.$watch('modelItemType', loadItemTemplate);
        scope.$watch('modelMaterial', loadItemTemplate);
    };

    return {
        restrict: 'E',
        scope: {
            model: '=',
            modelItemType: '<',
            modelMaterial: '<',
            itemType: '@'
        },
        link: itemTemplateLoaderLink
    }
});
