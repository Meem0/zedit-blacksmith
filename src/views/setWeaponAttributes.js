ngapp.run(function(workflowService) {
    let setWeaponAttributesController = function($scope, skyrimWeaponService) {
        let loadWeaponTemplate = function() {
            if (!$scope.input.weaponType || !$scope.model.material) {
                return;
            }

            const attributes = skyrimWeaponService.getWeaponAttributes($scope.input.weaponType, $scope.model.material);
            Object.assign($scope.model.weapon, attributes);
        };
        
        if (!$scope.model.weapon) {
            $scope.model.weapon = {
                'Record Header': {
                    Signature: 'WEAP'
                }
            };
        }

        $scope.$watch('model.material', loadWeaponTemplate);
        loadWeaponTemplate();
    };

    workflowService.addView('setWeaponAttributes', {
        templateUrl: `${moduleUrl}/partials/views/setWeaponAttributes.html`,
        controller: setWeaponAttributesController,
        requireInput: ['weaponType'],
        process: function(input, model) {
            if (model.weapon && model.weapon['EDID - Editor ID']) {
                return { weapon: model.weapon };
            }
        }
    });
});
