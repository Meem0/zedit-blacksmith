ngapp.run(function(workflowService, skyrimMaterialService, skyrimGearService, jsonService, skyrimReferenceService) {
    let overrideRecipes = jsonService.loadJsonFile('recipeOverrides').reduce((overrideRecipes, {itemType, material, ingredients}) => {
        let overrideRecipesForItem = overrideRecipes[itemType] = overrideRecipes[itemType] || {};
        overrideRecipesForItem[material] = ingredients.map(({name, count}) => ({
            itemReference: skyrimReferenceService.getReferenceFromName(name),
            count
        }));
        return overrideRecipes;
    }, {});
    let getOverrideRecipe = function(itemType, material) {
        let overrideRecipesForItem = overrideRecipes[itemType];
        if (overrideRecipesForItem) {
            let overrideRecipe = overrideRecipesForItem[material];
            if (overrideRecipe) {
                return overrideRecipe.map(({itemReference, count}) => ({itemReference, count}));
            }
        }
    };
    
    let getComponentsForMaterial = function(material) {
        return skyrimMaterialService.getComponentsForMaterial(material, /*includePlaceholders*/ true);
    };

    let buildIngredientsFromComponents = function(components, itemType, componentClass) {
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
                let ingredientIndex = ingredients.findIndex(({itemReference}) => itemReference === componentItemReference);
                if (ingredientIndex === -1) {
                    ingredients.push({
                        itemReference: componentItemReference,
                        count: myQuantity
                    });
                }
                else {
                    ingredients[ingredientIndex] = {
                        itemReference: componentItemReference,
                        count: ingredients[ingredientIndex].count + myQuantity
                    };
                }
            });
        });
        return ingredients;
    };

    let buildAutomaticComponentsRecipe = function(itemType, material, customComponents) {
        const defaultComponents = getComponentsForMaterial(material);
        let hasCustomComponents = false;
        const components = defaultComponents.map(({type, itemReference}, index) => {
            let customItemReference = customComponents && customComponents[index];
            if (customItemReference && customItemReference != itemReference) {
                hasCustomComponents = true;
            }
            return {
                type,
                itemReference: customItemReference || itemReference
            };
        });
        const overrideRecipe = hasCustomComponents ? undefined : getOverrideRecipe(itemType, material);
        if (overrideRecipe) {
            return overrideRecipe;
        }
        else {
            const componentClass = skyrimMaterialService.getMaterialClass(material);
            return buildIngredientsFromComponents(components, itemType, componentClass);
        }
    };

    let buildAutomaticTemperRecipe = function(material, customTemperIngredient) {
        const temperIngredient = customTemperIngredient || skyrimMaterialService.getTemperIngredientForMaterial(material);
        return [{
            itemReference: temperIngredient,
            count: 1
        }];
    };

    let buildRecipes = function(input, model) {
        const items = input.items || [];
        const recipes = items.map(item => {
            let recipe = {
                itemReference: item.reference
            };
            if (model.recipes) {
                const modelRecipe = model.recipes.find(({itemReference}) => itemReference === item.reference);
                if (modelRecipe && modelRecipe.editManually && Array.isArray(modelRecipe.customIngredients)) {
                    recipe.ingredients = modelRecipe.customIngredients;
                }
            }
            if (!recipe.ingredients) {
                recipe.ingredients = (input.makeTemperRecipes
                    ? buildAutomaticTemperRecipe(input.material, model.temperIngredient)
                    : buildAutomaticComponentsRecipe(item.type, input.material, model.components))
            }
            return recipe;
        });
        return {recipes};
    };

    let viewIngredientController = function($scope) {
        $scope.ingredientName = blacksmithHelpers.runOnReferenceRecord($scope.ingredient.itemReference, xelib.FullName) || '';
    };

    let editIngredientController = function($scope) {
        $scope.ingredientSignature = blacksmithHelpers.runOnReferenceRecord($scope.ingredient.itemReference, xelib.Signature) || 'MISC';
    
        $scope.ingredientLongName = {
            get value() {
                return blacksmithHelpers.runOnReferenceRecord($scope.ingredient.itemReference, xelib.LongName) || '';
            },
            set value(inValue) {
                $scope.ingredient.itemReference = blacksmithHelpers.getReferenceFromLongName(inValue);
            }
        };
    };
    
    let editRecipeController = function($scope) {
        let buildAutomaticRecipe = function() {
            debugger;
            if ($scope.input.makeTemperRecipes) {
                return buildAutomaticTemperRecipe($scope.input.material, $scope.model.temperIngredient);
            }
            else {
                return buildAutomaticComponentsRecipe($scope.item.type, $scope.input.material, $scope.model.components);
            }
        };
    
        let getOrAddRecipe = function() {
            if (!$scope.recipe) {
                $scope.recipe = {
                    itemReference: $scope.item.reference,
                    editManually: false,
                    customIngredients: buildAutomaticRecipe()
                };
                $scope.model.recipes.push($scope.recipe);
            }
            return $scope.recipe;
        };

        let rebuildAutomaticRecipe = function() {
            $scope.automaticIngredients = buildAutomaticRecipe();
        };

        rebuildAutomaticRecipe();
        $scope.$on('componentsUpdated', rebuildAutomaticRecipe);

        $scope.recipe = $scope.model.recipes.find(({itemReference}) => itemReference === $scope.item.reference);
        $scope.itemName = blacksmithHelpers.runOnReferenceRecord($scope.item.reference, xelib.FullName) || '';
        
        $scope.editManually = {
            get value() {
                return $scope.recipe ? $scope.recipe.editManually : false;
            },
            set value(inValue) {
                let recipe = getOrAddRecipe();
                recipe.editManually = inValue;
            }
        };
    
        $scope.addIngredient = function() {
            let recipe = getOrAddRecipe();
            recipe.customIngredients.push({
                itemReference: '',
                count: 1
            });
        };
    
        $scope.removeIngredient = function(ingredient) {
            let recipe = getOrAddRecipe();
            const index = recipe.customIngredients.indexOf(ingredient);
            if (index >= 0) {
                recipe.customIngredients.splice(index, 1);
            }
        };
    };

    let editRecipesController = function($scope) {
        $scope.ingredientSignatures = ['ALCH', 'AMMO', 'ARMO', 'BOOK', 'INGR', 'MISC', 'SCRL', 'SLGM', 'WEAP'];

        if (!$scope.model.recipes) {
            $scope.model.recipes = [];
        }
        $scope.items = $scope.input.items;

        if ($scope.input.makeTemperRecipes) {
            const defaultTemperIngredient = skyrimMaterialService.getTemperIngredientForMaterial($scope.input.material);
            let getTemperIngredient = function() {
                return $scope.model.temperIngredient || defaultTemperIngredient;
            };
            $scope.temperIngredient = {
                signature: blacksmithHelpers.runOnReferenceRecord(getTemperIngredient(), xelib.Signature) || 'MISC',
                get itemReference() {
                    return getTemperIngredient();
                },
                get longName() {
                    return blacksmithHelpers.runOnReferenceRecord(getTemperIngredient(), xelib.LongName) || '';
                },
                set longName(value) {
                    $scope.model.temperIngredient = blacksmithHelpers.getReferenceFromLongName(value);
                }
            };
        }
        else {
            const defaultComponents = getComponentsForMaterial($scope.input.material);
            $scope.components = defaultComponents.map(({type, itemReference}, index) => {
                let getComponentItemReference = function() {
                    return ($scope.model.components && $scope.model.components[index]) || itemReference;
                };
                return {
                    type,
                    signature: blacksmithHelpers.runOnReferenceRecord(getComponentItemReference(), xelib.Signature) || 'MISC',
                    get itemReference() {
                        return getComponentItemReference();
                    },
                    get longName() {
                        return blacksmithHelpers.runOnReferenceRecord(getComponentItemReference(), xelib.LongName) || '';
                    },
                    set longName(value) {
                        if (!$scope.model.components) {
                            $scope.model.components = [];
                        }
                        $scope.model.components[index] = blacksmithHelpers.getReferenceFromLongName(value);

                        $scope.$broadcast('componentsUpdated');
                    }
                };
            });
        }
        
        $scope.viewIngredientController = viewIngredientController;
        $scope.editIngredientController = editIngredientController;
        $scope.editRecipeController = editRecipeController;
    };

    workflowService.addView('editRecipes', {
        templateUrl: `${moduleUrl}/partials/views/editRecipes.html`,
        controller: editRecipesController,
        requireInput: ['items', 'material', 'makeTemperRecipes'],
        process: buildRecipes
    });
});
