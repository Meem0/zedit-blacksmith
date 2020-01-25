ngapp.run(function(workflowService) {
    let setWeaponAttributesController = function($scope, skyrimWeaponService, skyrimMaterialService) {
        $scope.model.weapon = {};

        let {getWeaponAttributes} = skyrimWeaponService,
            {getMaterials} = skyrimMaterialService,
            weapon = $scope.model.weapon;

        $scope.$watch('weapon.material', function() {
            let {material, weaponType} = weapon,
                attributes = getWeaponAttributes(weaponType, material);
            Object.assign(weapon, attributes);
        });

        $scope.$watch('weapon.name', function() {
            if (typeof(weapon.name) !== 'string') return;
            weapon.editorID = weapon.name.toPascalCase();
        });

        // INITIALIZATION
        $scope.meshesPath = `${xelib.GetGlobal('DataPath')}\\meshes`;
        $scope.meshFiles = [
            { name: 'NetImmerse Model Files', extensions: ['nif'] }
        ];
        $scope.materials = getMaterials();
        if (!weapon.material)
            weapon.material = $scope.materials[0];
    };

    workflowService.addView('setWeaponAttributes', {
        templateUrl: `${moduleUrl}/partials/setWeaponAttributes.html`,
        controller: setWeaponAttributesController,
        validate: () => false
    });
});