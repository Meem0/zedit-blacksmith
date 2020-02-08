ngapp.run(function(workflowService, blacksmithHelpersService, skyrimMaterialService, skyrimGearService) {
    const signatures = ['AMMO', 'ARMO', 'WEAP'];
    const ingredientSignatures = ['ALCH', 'AMMO', 'ARMO', 'BOOK', 'INGR', 'MISC', 'SCRL', 'SLGM', 'WEAP'];

    let getItemMaterial = function(handle) {
        const materialKeywords = skyrimMaterialService.getMaterialKeywords();
        const materialKeyword = materialKeywords.find(keyword => xelib.HasKeyword(handle, keyword));
        return skyrimMaterialService.getMaterialForKeyword(materialKeyword);
    };

    let getItemType = function(handle) {
        const itemTypeKeywords = skyrimGearService.getItemTypeKeywords();
        const itemTypeKeyword = itemTypeKeywords.find(keyword => xelib.HasKeyword(handle, keyword));
        return skyrimGearService.getItemTypeForKeyword(itemTypeKeyword);
    };

    let getItemsFromSelectedNodes = function(selectedNodes) {
        if (!selectedNodes) {
            return [];
        }

        return selectedNodes.reduce((items, {handle}) => {
            if (!blacksmithHelpersService.isMainRecord(handle)) {
                return items;
            }
            if (!signatures.includes(xelib.Signature(handle))) {
                return items;
            }

            items.push({
                name: xelib.FullName(handle),
                itemType: getItemType(handle)
            });
            return items;
        }, []);
    };

    let getComponentsForMaterial = function(material) {
        let components = skyrimMaterialService.getComponentTypes().map(componentType => ({
            type: componentType,
            name: '',
            signature: ''
        }));
        skyrimMaterialService.getComponentsForMaterial(material).forEach(({type, name}) => {
            for (const component of components) {
                if (component.type === type && !component.name) {
                    xelib.WithHandle(
                        blacksmithHelpersService.findElementInFiles(`"${name}"`),
                        id => {
                            if (id) {
                                component.name = name;
                                component.signature = xelib.Signature(id);
                            }
                        }
                    );
                    break;
                }
            }
        });
        return components;
    };

    let editRecipesController = function($scope) {
        debugger;
        const selectedNodes = $scope.modalOptions && Array.isArray($scope.modalOptions.selectedNodes) ? $scope.modalOptions.selectedNodes : [];
        if (!$scope.model.items) {
            $scope.model.items = getItemsFromSelectedNodes(selectedNodes);
        }
        if (!$scope.model.material && selectedNodes.length > 0) {
            $scope.model.material = getItemMaterial(selectedNodes[0].handle);
        }
        $scope.components = getComponentsForMaterial($scope.model.material);
        $scope.ingredientSignatures = ingredientSignatures;
    };

    workflowService.addView('editRecipes', {
        templateUrl: `${moduleUrl}/partials/editRecipes.html`,
        controller: editRecipesController,
        validate: () => true
    });
});
