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
            return overrideRecipesForItem[material];
        }
    };

    let getReferenceFromLongName = function(longName) {
        return xelib.WithHandle(
            blacksmithHelpers.getRecordFromLongName(longName),
            id => blacksmithHelpers.getReferenceFromRecord(id)
        );
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

    let createViewModel = function(recipes, input, model) {
        let viewModel = {};

        viewModel.recipes = recipes.map(recipe => {
            let getModelRecipe = function() {
                if (!model.recipes) {
                    model.recipes = [];
                }
                return model.recipes.find(({itemReference}) => itemReference === recipe.itemReference);
            };
            let getOrAddModelRecipe = function() {
                let modelRecipe = getModelRecipe();
                if (modelRecipe) {
                    return modelRecipe;
                }
                modelRecipe = {
                    itemReference: recipe.itemReference,
                    useCustomIngredients: false,
                    customIngredients: recipe.ingredients.map(({itemReference, count}) => ({
                        itemReference,
                        count,
                        signature: blacksmithHelpers.runOnReferenceRecord(itemReference, xelib.Signature) || 'MISC'
                    }))
                };
                model.recipes.push(modelRecipe);
                return modelRecipe;
            };

            const modelRecipe = getModelRecipe();
            const useCustomIngredients = modelRecipe ? modelRecipe.useCustomIngredients : false;

            const item = input.items.find(({itemReference}) => itemReference === recipe.itemReference);
            return {
                itemReference: recipe.itemReference,
                itemName: blacksmithHelpers.runOnReferenceRecord(recipe.itemReference, xelib.FullName) || '',
                itemType: item ? item.type : '',
                addIngredient: function() {
                    let modelRecipe = getOrAddModelRecipe();
                    modelRecipe.customIngredients.push({
                        itemReference: '',
                        count: 0,
                        signature: 'MISC'
                    });
                },
                removeIngredient: function(ingredient) {
                    let modelRecipe = getOrAddModelRecipe();
                    const index = modelRecipe.customIngredients.indexOf(ingredient.modelIngredient);
                    if (index >= 0) {
                        modelRecipe.customIngredients.splice(index, 1);
                    }
                },
                ingredients: (useCustomIngredients
                    ? (getOrAddModelRecipe().customIngredients.map(ingredient => ({
                        modelIngredient: ingredient, // for removeIngredient
                        get name() {
                            return blacksmithHelpers.runOnReferenceRecord(ingredient.itemReference, xelib.FullName) || '';
                        },
                        get count() {
                            return ingredient.count;
                        },
                        set count(value) {
                            ingredient.count = value;
                        },
                        get longName() {
                            return blacksmithHelpers.runOnReferenceRecord(ingredient.itemReference, xelib.LongName) || '';
                        },
                        set longName(value) {
                            let reference = getReferenceFromLongName(value);
                            ingredient.itemReference = reference;
                        },
                        get signature() {
                            return ingredient.signature;
                        },
                        set signature(value) {
                            ingredient.signature = value;
                        }
                    })))
                    : (recipe.ingredients.map(ingredient => ({
                        get name() {
                            return blacksmithHelpers.runOnReferenceRecord(ingredient.itemReference, xelib.FullName) || '';
                        },
                        count: ingredient.count
                    })))
                ),
                get editManually() {
                    return useCustomIngredients;
                },
                set editManually(value) {
                    let modelRecipe = getOrAddModelRecipe();
                    modelRecipe.useCustomIngredients = value;
                }
            };
        });

        const defaultComponents = getComponentsForMaterial(input.material);
        viewModel.components = defaultComponents.map((defaultComponent, index) => {
            let getModelComponent = function() {
                if (!model.components) {
                    model.components = [];
                }
                return model.components[index];
            };
            let getOrAddModelComponent = function() {
                let modelComponent = getModelComponent();
                if (modelComponent) {
                    return modelComponent;
                }
                modelComponent = {
                    type: defaultComponent.type,
                    itemReference: defaultComponent.itemReference
                };
                model.components[index] = modelComponent;
            };
            return {
                type: defaultComponent.type,
                get longName() {
                    let modelComponent = getModelComponent();
                    let componentItemReference = modelComponent ? modelComponent.itemReference : defaultComponent.itemReference;
                    return blacksmithHelpers.runOnReferenceRecord(componentItemReference, xelib.LongName) || '';
                },
                set longName(value) {
                    let modelComponent = getOrAddModelComponent();
                    let itemReference = getReferenceFromLongName(value);
                    modelComponent.itemReference = itemReference;
                },
                get signature() {
                    let modelComponent = getModelComponent();
                    if (modelComponent) {
                        return modelComponent.signature;
                    }
                    return blacksmithHelpers.runOnReferenceRecord(defaultComponent.itemReference, xelib.Signature) || '';
                },
                set signature(value) {
                    let modelComponent = getOrAddModelComponent();
                    modelComponent.signature = value;
                }
            };
        });

        const defaultTemperIngredient = skyrimMaterialService.getTemperIngredientForMaterial(input.material);
        let getOrAddModelTemperIngredient = function() {
            if (model.temperIngredient) {
                return model.temperIngredient;
            }
            model.temperIngredient = {
                itemReference: defaultTemperIngredient.itemReference,
                signature: blacksmithHelpers.runOnReferenceRecord(defaultTemperIngredient.itemReference, xelib.Signature) || 'MISC'
            };
            return model.temperIngredient;
        };
        viewModel.temperIngredient = {
            get longName() {
                const itemReference = model.temperIngredient ? model.temperIngredient.itemReference : defaultTemperIngredient.itemReference;
                return blacksmithHelpers.runOnReferenceRecord(itemReference, xelib.LongName) || '';
            },
            set longName(value) {
                let modelTemperIngredient = getOrAddModelTemperIngredient();
                let itemReference = getReferenceFromLongName(value);
                modelTemperIngredient.itemReference = itemReference;
            },
            get signature() {
                return model.temperIngredient ? model.temperIngredient.signature : defaultTemperIngredient.signature;
            },
            set signature(value) {
                let modelTemperIngredient = getOrAddModelTemperIngredient();
                modelTemperIngredient.signature = value;
            }
        };

        return viewModel;
    };

    let buildRecipes = function(input, model) {
        const items = input.items || [];
        const recipes = items.map(item => {
            let recipe = {
                itemReference: item.reference
            };
            if (model.recipes) {
                const modelRecipe = model.recipes.find(({itemReference}) => itemReference === item.reference);
                if (modelRecipe && modelRecipe.useCustomIngredients && Array.isArray(modelRecipe.customIngredients)) {
                    recipe.ingredients = modelRecipe.customIngredients;
                }
            }
            if (!recipe.ingredients) {
                if (input.makeTemperRecipes) {
                    const temperIngredient = (model.temperIngredient
                        ? model.temperIngredient.itemReference
                        : skyrimMaterialService.getTemperIngredientForMaterial(input.material));
                    recipe.ingredients = [{
                        itemReference: temperIngredient,
                        count: 1
                    }];
                }
                else {
                    const defaultComponents = getComponentsForMaterial(input.material);
                    const hasCustomComponents = model.components && model.components.length > 0;
                    const overrideRecipe = hasCustomComponents ? undefined : getOverrideRecipe(item.type, input.material);
                    if (overrideRecipe) {
                        recipe.ingredients = overrideRecipe;
                    }
                    else {
                        const components = (hasCustomComponents
                            ? defaultComponents.map((defaultComponent, index) => {
                                return model.components[index] ? model.components[index] : defaultComponent;
                            })
                            : defaultComponents);
                        const componentClass = skyrimMaterialService.getMaterialClass(input.material);
                        recipe.ingredients = buildIngredientsFromComponents(components, item.type, componentClass);
                    }
                }
            }
            return recipe;
        });
        return {recipes};
    };

    let editRecipesController = function($scope) {
        $scope.ingredientSignatures = ['ALCH', 'AMMO', 'ARMO', 'BOOK', 'INGR', 'MISC', 'SCRL', 'SLGM', 'WEAP'];

        let {recipes} = buildRecipes($scope.input, $scope.model);
        $scope.viewModel = createViewModel(recipes, $scope.input, $scope.model);

        $scope.$on('workflowProcessed', function(e, workflowModel) {
            $scope.viewModel = createViewModel(workflowModel.recipes, $scope.input, $scope.model);
        });
    };

    workflowService.addView('editRecipes', {
        templateUrl: `${moduleUrl}/partials/views/editRecipes.html`,
        controller: editRecipesController,
        requireInput: ['items', 'material', 'makeTemperRecipes'],
        process: buildRecipes
    });
});
