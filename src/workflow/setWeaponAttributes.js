ngapp.run(function(workflowService) {
    let setWeaponAttributesController = function($scope) {
        if (typeof($scope.model.weapon) !== 'object') {
            $scope.model.weapon = {};
        }

        let model = $scope.model;
        let weapon = model.weapon;
        $scope.weapon = weapon;

        // INITIALIZATION
        $scope.meshesPath = `${xelib.GetGlobal('DataPath')}\\meshes`;
        $scope.meshFiles = [
            { name: 'NetImmerse Model Files', extensions: ['nif'] }
        ];
    };

    workflowService.addView('setWeaponAttributes', {
        templateUrl: `${moduleUrl}/partials/setWeaponAttributes.html`,
        controller: setWeaponAttributesController,
        validate: () => false
    });
});