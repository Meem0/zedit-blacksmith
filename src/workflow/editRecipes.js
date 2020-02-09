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

    let getFullNameFromReference = function(reference) {
        return xelib.WithHandle(
            blacksmithHelpersService.getRecordFromReference(reference),
            id => id ? xelib.FullName(id) : ''
        );
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
                reference: blacksmithHelpersService.getReferenceFromRecord(handle),
                type: getItemType(handle),
                get name() {
                    return getFullNameFromReference(this.reference);
                }
            });
            return items;
        }, []);
    };

    let getComponentsForMaterial = function(material) {
        let components = skyrimMaterialService.getComponentsForMaterial(material, /*includePlaceholders*/ true);
        components.forEach(component => {
            xelib.WithHandle(
                blacksmithHelpersService.getRecordFromReference(component.itemReference),
                id => {
                    if (id) {
                        component.signature = xelib.Signature(id);
                    }
                }
            );
            Object.defineProperty(component, 'longName', {
                get() {
                    return xelib.WithHandle(
                        blacksmithHelpersService.getRecordFromReference(this.itemReference),
                        id => id ? xelib.LongName(id) : ''
                    );
                },
                set(longName) {
                    this.itemReference = xelib.WithHandle(
                        blacksmithHelpersService.getRecordFromLongName(longName),
                        id => blacksmithHelpersService.getReferenceFromRecord(id)
                    );
                }
            });
        });
        return components;
    };

    let buildIngredientsList = function(components, itemType, componentClass) {
        let ingredients = skyrimGearService.getRecipeAdditionalComponents(itemType, componentClass);
        const groupedComponents = components.reduce((groupedComponents, component) => {
            if (component.itemReference) {
                groupedComponents[component.type] = (groupedComponents[component.type] || []).concat(component.itemReference);
            }
            return groupedComponents;
        }, {});
        // groupedComponents: e.g. {Primary:["Skyrim.esm:03ADA4"],Major:["Skyrim.esm:03ADA4","Skyrim.esm:05AD9D"],Binding:["Skyrim.esm:0800E4"]}
        Object.entries(groupedComponents).forEach(([componentType, componentItemReferences]) => {
            const quantity = skyrimGearService.getRecipeComponentQuantity(itemType, componentType, componentClass);
            if (!quantity) {
                return;
            }
            let additionalQuantity = quantity % componentItemReferences.length;
            componentItemReferences.forEach(componentItemReference => {
                const myQuantity = Math.floor(quantity / componentItemReferences.length) + (additionalQuantity-- > 0 ? 1 : 0);
                if (myQuantity <= 0) {
                    return;
                }
                let ingredient = ingredients.find(({itemReference}) => itemReference === componentItemReference);
                if (!ingredient) {
                    ingredients.push({
                        itemReference: componentItemReference,
                        count: myQuantity,
                        get name() {
                            return getFullNameFromReference(this.itemReference);
                        }
                    });
                }
                else {
                    ingredient.count += myQuantity;
                }
            });
        });
        return ingredients;
    };

    /*
    $scope: {
        model: {
            items: [
                {
                    reference: (e.g. "Skyrim.esm:012E49"),
                    name: (e.g. "Iron Sword") (get from reference)
                    type: (e.g. "Sword"),
                    ingredients: [
                        {
                            itemReference: (e.g. "Skyrim.esm:05ACE4"),
                            name: (e.g. "Iron Ingot") (get from itemReference)
                            count: (e.g. 2)
                        }
                    ]
                }
            ],
            material: (e.g. "Iron")
        },
        components: [
            {
                type: (e.g. "Major"),
                itemReference: (e.g. "Skyrim.esm:05ACE4"),
                longName: (e.g. "IngotIron "Iron Ingot" [MISC:Skyrim.esm:05ACE4]") (get / set from itemReference)
                signature: (e.g. "MISC")
            }
        ]
    }
    */
    let editRecipesController = function($scope) {
        const selectedNodes = $scope.modalOptions && Array.isArray($scope.modalOptions.selectedNodes) ? $scope.modalOptions.selectedNodes : [];
        if (!$scope.model.items) {
            $scope.model.items = getItemsFromSelectedNodes(selectedNodes);
        }
        if (!$scope.model.material && selectedNodes.length > 0) {
            $scope.model.material = getItemMaterial(selectedNodes[0].handle);
        }
        $scope.components = getComponentsForMaterial($scope.model.material);
        $scope.ingredientSignatures = ingredientSignatures;
        const componentClass = skyrimMaterialService.getMaterialClass($scope.model.material);

        $scope.$watch('components', function() {
            $scope.model.items.forEach(item => {
                item.ingredients = buildIngredientsList($scope.components, item.type, componentClass);
            });
        }, true);
    };

    workflowService.addView('editRecipes', {
        templateUrl: `${moduleUrl}/partials/editRecipes.html`,
        controller: editRecipesController,
        validate: () => true
    });
});
