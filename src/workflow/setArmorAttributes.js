ngapp.run(function(workflowService) {
    let setArmorAttributesController = function($scope, skyrimArmorService) {
        let loadArmorTemplate = function() {
            if (!$scope.model.armorType || !$scope.model.material) {
                return;
            }

            const attributes = skyrimArmorService.getArmorAttributes($scope.model.armorType, $scope.model.material);
            Object.assign($scope.model.armor, attributes);
        };
        
        $scope.model.armor = {
            'Record Header': {
                Signature: 'ARMO'
            }
        };

        $scope.$watch('model.armorType', loadArmorTemplate);
        $scope.$watch('model.material', loadArmorTemplate);
        loadWeaponTemplate();
    };

    workflowService.addView('setArmorAttributes', {
        templateUrl: `${moduleUrl}/partials/setArmorAttributes.html`,
        controller: setArmorAttributesController,
        validate: () => true
    });
});