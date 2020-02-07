ngapp.run(function(workflowService, blacksmithHelpersService, skyrimMaterialService) {
    const signatures = ['AMMO', 'ARMO', 'WEAP'];

    let getItemMaterial = function(handle) {
        const materialKeywords = skyrimMaterialService.getMaterialKeywords();
        const materialKeyword = materialKeywords.find(keyword => xelib.HasKeyword(handle, keyword));
        return skyrimMaterialService.getMaterialForKeyword(materialKeyword);
    };

    let getItemsFromSelectedNodes = function(selectedNodes) {
        if (!selectedNodes) {
            return [];
        }

        return selectedNodes.reduce((items, {handle}) => {
            if (!blacksmithHelpersService.isMainRecord(handle)) {
                return items;
            }
            if (!signatures.includes(xelib.GetValue(handle, 'Record Header\\Signature'))) {
                return items;
            }

            items.push({
                name: xelib.FullName(handle),
                material: getItemMaterial(handle)
            });
            return items;
        }, []);
    };

    let editRecipesController = function($scope) {
        if (!$scope.model.items) {
            $scope.model.items = getItemsFromSelectedNodes($scope.selectedNodes);
        }
    };

    workflowService.addView('editRecipes', {
        templateUrl: `${moduleUrl}/partials/editRecipes.html`,
        controller: editRecipesController,
        validate: () => true
    });
});