ngapp.run(function(workflowService, blacksmithHelpersService, skyrimMaterialService, skyrimGearService) {
    const ingredientSignatures = ['ALCH', 'AMMO', 'ARMO', 'BOOK', 'INGR', 'MISC', 'SCRL', 'SLGM', 'WEAP'];

    let getReferenceFromLongName = function(longName) {
        return xelib.WithHandle(
            blacksmithHelpersService.getRecordFromLongName(longName),
            id => blacksmithHelpersService.getReferenceFromRecord(id)
        );
    };
    
    let createIngredient = function(itemReference = '', count = 0) {
        return {
            itemReference: itemReference,
            count: count,
            signature: blacksmithHelpersService.runOnReferenceRecord(this.itemReference, xelib.Signature) || 'MISC',
            get name() {
                return blacksmithHelpersService.runOnReferenceRecord(this.itemReference, xelib.FullName) || '';
            },
            get longName() {
                return blacksmithHelpersService.runOnReferenceRecord(this.itemReference, xelib.LongName) || '';
            },
            set longName(value) {
                this.itemReference = getReferenceFromLongName(value);
            }
        };
    };

    let getComponentsForMaterial = function(material) {
        return skyrimMaterialService.getComponentsForMaterial(material, /*includePlaceholders*/ true).map(component => ({
            ...component,
            signature: blacksmithHelpersService.runOnReferenceRecord(this.itemReference, xelib.Signature) || 'MISC',
            get longName() {
                return blacksmithHelpersService.runOnReferenceRecord(this.itemReference, xelib.LongName) || '';
            },
            set longName(value) {
                this.itemReference = getReferenceFromLongName(value);
            }
        }));
    };

    let buildIngredientsList = function(components, itemType, componentClass) {
        let ingredients = skyrimGearService.getRecipeAdditionalComponents(itemType, componentClass).map(
            ({itemReference, count}) => createIngredient(itemReference, count)
        );
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
                    ingredients.push(createIngredient(componentItemReference, myQuantity));
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
            recipes: [
                item: {
                    reference: (e.g. "Skyrim.esm:012E49"),
                    name: (e.g. "Iron Sword") (get from reference),
                    editorId: (e.g. "WeaponIronSword") (get from reference)
                    type: (e.g. "Sword")
                },
                ingredients: [
                    {
                        itemReference: (e.g. "Skyrim.esm:05ACE4"),
                        name: (e.g. "Iron Ingot") (get from itemReference),
                        longName: (e.g. "IngotIron "Iron Ingot" [MISC:Skyrim.esm:05ACE4]") (get / set from itemReference),
                        count: (e.g. 2),
                        signature: (e.g. "MISC")
                    }
                ],
                editManually: (true / false)
            ],
            material: (e.g. "Iron"),
            components: [
                {
                    type: (e.g. "Major"),
                    itemReference: (e.g. "Skyrim.esm:05ACE4"),
                    longName: (e.g. "IngotIron "Iron Ingot" [MISC:Skyrim.esm:05ACE4]") (get / set from itemReference)
                    signature: (e.g. "MISC")
                }
            ]
        }
    }
    */
    let editRecipesController = function($scope) {
        $scope.model.recipes = $scope.model.items.reduce((recipes, item) => {
            if (item.material === $scope.model.material) {
                recipes.push({
                    item: item,
                    editManually: false,
                    get editorId() {
                        return 'Recipe' + this.item.editorId;
                    }
                });
            }
            return recipes;
        }, []);
        $scope.model.components = getComponentsForMaterial($scope.model.material);
        $scope.ingredientSignatures = ingredientSignatures;
        const componentClass = skyrimMaterialService.getMaterialClass($scope.model.material);

        $scope.$watch('model.components', function() {
            $scope.model.recipes.forEach(recipe => {
                if (!recipe.editManually) {
                    recipe.ingredients = buildIngredientsList($scope.model.components, recipe.item.type, componentClass);
                }
            });
        }, true);
        
        $scope.toggleEditManually = function(recipe) {
            if (!recipe.editManually) {
                recipe.ingredients = buildIngredientsList($scope.model.components, recipe.item.type, componentClass);
            }
        };
        
        $scope.addIngredient = function(recipe) {
            recipe.ingredients.push(createIngredient());
        };
        
        $scope.removeIngredient = function(recipe, ingredient) {
            const index = recipe.ingredients.indexOf(ingredient);
            if (index >= 0) {
                recipe.ingredients.splice(index, 1);
            }
        };
    };

    workflowService.addView('editRecipes', {
        templateUrl: `${moduleUrl}/partials/editRecipes.html`,
        controller: editRecipesController,
        validate: () => true
    });
});
