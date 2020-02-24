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
    
    let generateRecipes = function(items, material, isTemper, existingRecipes) {
        return items.reduce((recipes, item) => {
            if (item.material === material) {
                const existingRecipe = existingRecipes.find(existingRecipe => existingRecipe.item.reference === item.reference);
                
                recipes.push({
                    item: item,
                    ingredients: existingRecipe ? existingRecipe.ingredients : [],
                    editManually: existingRecipe ? existingRecipe.editManually : false,
                    isTemper: isTemper,
                    get editorId() {
                        return (this.isTemper ? 'Temper' : 'Recipe') + this.item.editorId;
                    }
                });
            }
            return recipes;
        }, []);
    };

    /*
    $scope: {
        input: {
            material: (e.g. "Iron"),
            items: [{
                reference: (e.g. "Skyrim.esm:012E49"),
                name: (e.g. "Iron Sword") (get from reference),
                editorId: (e.g. "WeaponIronSword") (get from reference)
                type: (e.g. "Sword")
            }]
        }
        model: {
            recipes: [
                item: { (same as input.items) },
                ingredients: [
                    {
                        itemReference: (e.g. "Skyrim.esm:05ACE4"),
                        name: (e.g. "Iron Ingot") (get from itemReference),
                        longName: (e.g. "IngotIron "Iron Ingot" [MISC:Skyrim.esm:05ACE4]") (get / set from itemReference),
                        count: (e.g. 2),
                        signature: (e.g. "MISC")
                    }
                ],
                editManually: (true / false),
                isTemper: (true / false),
                editorId: (e.g. "RecipeIronSword") (get from item.editorId and isTemper)
            ],
            components: [
                {
                    type: (e.g. "Major"),
                    itemReference: (e.g. "Skyrim.esm:05ACE4"),
                    longName: (e.g. "IngotIron "Iron Ingot" [MISC:Skyrim.esm:05ACE4]") (get / set from itemReference)
                    signature: (e.g. "MISC")
                }
            ],
            temperItem: {
                itemReference: (e.g. "Skyrim.esm:05ACE4"),
                name: (e.g. "Iron Ingot") (get from itemReference),
                longName: (e.g. "IngotIron "Iron Ingot" [MISC:Skyrim.esm:05ACE4]") (get / set from itemReference),
                count: (e.g. 2),
                signature: (e.g. "MISC")
            }
        }
    }
    */
    let editRecipesController = function($scope) {
        $scope.model.recipes = generateRecipes(
            $scope.input.items,
            $scope.input.material,
            $scope.input.makeTemperRecipes,
            $scope.model.recipes || []
        );

        const inputMaterialChanged = $scope.model.cachedInputMaterial !== $scope.input.material;
        if ($scope.input.makeTemperRecipes && (inputMaterialChanged || !$scope.model.temperIngredient)) {
            $scope.model.temperIngredient = createIngredient(
                skyrimMaterialService.getTemperIngredientForMaterial($scope.input.material),
                1
            );
        }
        else if (!$scope.input.makeTemperRecipes && (inputMaterialChanged || !$scope.model.components)) {
            $scope.model.components = getComponentsForMaterial($scope.input.material);
        }
        $scope.model.cachedInputMaterial = $scope.input.material;

        $scope.ingredientSignatures = ingredientSignatures;
        const componentClass = skyrimMaterialService.getMaterialClass($scope.input.material);

        let rebuildRecipe = function(recipe) {
            if (recipe && !recipe.editManually) {
                if ($scope.input.makeTemperRecipes) {
                    recipe.ingredients = [createIngredient($scope.model.temperIngredient.itemReference, $scope.model.temperIngredient.count)];
                }
                else {
                    recipe.ingredients = buildIngredientsList($scope.model.components, recipe.item.type, componentClass);
                }
            }
        };

        $scope.$watch($scope.input.makeTemperRecipes ? 'model.temperIngredient' : 'model.components', function() {
            $scope.model.recipes.forEach(rebuildRecipe);
        }, true);
        
        $scope.toggleEditManually = function(recipe) {
            rebuildRecipe(recipe);
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
        requireInput: ['items', 'material', 'makeTemperRecipes'],
        process: function(input, model) {
            if (!Array.isArray(model.recipes)) {
                return;
            }
            const outputRecipes = generateRecipes(
                input.items,
                input.material,
                input.makeTemperRecipes,
                model.recipes
            );
            return { recipes: outputRecipes };
        }
    });
});
