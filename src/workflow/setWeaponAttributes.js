ngapp.run(function(workflowService) {
    let setWeaponAttributesController = function($scope, skyrimWeaponService) {
        let loadWeaponTemplate = function() {
            if (!$scope.model.weaponType || !$scope.model.material) {
                return;
            }

            const attributes = skyrimWeaponService.getWeaponAttributes($scope.model.weaponType, $scope.model.material);
            Object.assign($scope.model.weapon, attributes);
        };
        
        $scope.model.weapon = {
            'Record Header': {
                Signature: 'WEAP'
            }
        };

        $scope.$watch('model.weaponType', loadWeaponTemplate);
        $scope.$watch('model.material', loadWeaponTemplate);
        loadWeaponTemplate();
    };

    workflowService.addView('setWeaponAttributes', {
        templateUrl: `${moduleUrl}/partials/setWeaponAttributes.html`,
        controller: setWeaponAttributesController,
        validate: () => true
    });
});