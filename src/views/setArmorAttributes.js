ngapp.run(function(workflowService) {
    let setArmorAttributesController = function($scope, skyrimArmorService) {
        let loadArmorTemplate = function() {
            if (!$scope.input.armorType || !$scope.model.material) {
                return;
            }

            const attributes = skyrimArmorService.getArmorAttributes($scope.input.armorType, $scope.model.material);
            Object.assign($scope.model.armor, attributes);
        };
        
        if (!$scope.model.armor) {
            $scope.model.armor = {
                'Record Header': {
                    Signature: 'ARMO'
                }
            };
        }

        $scope.$watch('model.material', loadArmorTemplate);
        loadArmorTemplate();
    };

    workflowService.addView('setArmorAttributes', {
        templateUrl: `${moduleUrl}/partials/views/setArmorAttributes.html`,
        controller: setArmorAttributesController,
        requireInput: ['armorType'],
        process: function(input, model) {
            if (model.armor && model.armor['EDID - Editor ID']) {
                return { armor: model.armor };
            }
        }
    });
});
