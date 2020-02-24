ngapp.run(function(workflowService, blacksmithHelpersService, skyrimMaterialService, skyrimGearService, writeObjectToElementService) {
    let createRecipeObject = function({
        editorId,
        ingredients,
        createdObjectReference,
        workbenchReference,
        createdObjectCount,
        isTemper,
        perkReference
    }) {
        let recipeObject = {
            "Record Header": {
                "Signature": "COBJ"
            },
            "EDID": editorId,
            "Items": ingredients.map(ingredient => ({
                "CNTO": {
                    "Item": ingredient.itemReference,
                    "Count": ingredient.count
                }
            })),
            "CNAM": createdObjectReference,
            "BNAM": workbenchReference,
            "NAM1": createdObjectCount
        };
        if (isTemper) {
            recipeObject["Conditions"] = [{
                "CTDA": {
                    "Type": 33, // OR
                    "Comparison Value": 1,
                    "Function": 659, // EPTemperingItemIsEnchanted
                }
            }, {
                "CTDA": {
                    "Comparison Value": 1,
                    "Function": 448, // HasPerk
                    "Parameter #1": 'Skyrim.esm:05218E' // ArcaneBlacksmith
                }
            }];
        }
        else if (perkReference) {
            recipeObject["Conditions"] = [{
                "CTDA": {
                    "Comparison Value": 1,
                    "Function": 448, // HasPerk
                    "Parameter #1": perkReference
                }
            }];
        }
        return recipeObject;
    };

    let getOrAddFile = function(filename) {
        let fileId = xelib.FileByName(filename);
        if (!fileId) {
            fileId = xelib.AddFile(filename);
        }
        return fileId;
    };

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

    const constructibleItemSignatures = ['AMMO', 'ARMO', 'WEAP'];

    let getItemsFromSelectedNodes = function(selectedNodes) {
        if (!selectedNodes) {
            return [];
        }

        return selectedNodes.reduce((items, {handle}) => {
            if (!blacksmithHelpersService.isMainRecord(handle)) {
                return items;
            }
            if (!constructibleItemSignatures.includes(xelib.Signature(handle))) {
                return items;
            }

            items.push({
                reference: blacksmithHelpersService.getReferenceFromRecord(handle),
                type: getItemType(handle),
                material: getItemMaterial(handle),
                get name() {
                    return blacksmithHelpersService.runOnReferenceRecord(this.reference, xelib.FullName) || '';
                },
                get editorId() {
                    return blacksmithHelpersService.runOnReferenceRecord(this.reference, xelib.EditorID) || '';
                }
            });
            return items;
        }, []);
    };

    let startWorkflow = function(input, scope, makeTemperRecipes) {
        let items = input.items;
        if (!items) {
            const selectedNodes = scope.modalOptions && Array.isArray(scope.modalOptions.selectedNodes) ? scope.modalOptions.selectedNodes : [];
            items = getItemsFromSelectedNodes(selectedNodes);
        }
        return {
            makeTemperRecipes: makeTemperRecipes,
            items
        };
    };

    let getWorkbenchReference = function(isTemper, itemType) {
        if (!isTemper) {
            return 'Skyrim.esm:088105';
        }
        return skyrimGearService.isWeapon(itemType) ? 'Skyrim.esm:088108' : 'Skyrim.esm:0ADB78';
    };

    let finishWorkflow = function(model) {
        if (model && model.recipes) {
            xelib.WithHandle(
                getOrAddFile(model.plugin),
                pluginId => {
                    xelib.AddAllMasters(pluginId);
                    model.recipes.forEach(recipe => {
                        let recipeProperties = {
                            editorId: recipe.editorId,
                            ingredients: recipe.ingredients,
                            createdObjectReference: recipe.item.reference,
                            workbenchReference: getWorkbenchReference(recipe.isTemper, recipe.item.type),
                            createdObjectCount: 1,
                            isTemper: recipe.isTemper
                        };
                        if (!recipe.isTemper) {
                            recipeProperties.perkReference = skyrimMaterialService.getMaterialSmithingPerk(model.material);
                        }
                        const recipeObject = createRecipeObject(recipeProperties);
                        writeObjectToElementService.writeObjectToRecord(pluginId, recipeObject);
                    });
                    xelib.CleanMasters(pluginId);
                }
            );
        }
    };

    workflowService.addWorkflow({
        name: 'makeRecipes',
        label: 'Make Crafting Recipes',
        image: `${modulePath}/resources/images/Recipe.png`,
        games: [xelib.gmTES5, xelib.gmSSE],
        start: (input, scope) => startWorkflow(input, scope, /*makeTemperRecipes*/ false),
        finish: finishWorkflow,
        stages: [{
            name: 'Select Material',
            view: 'selectRecipeMaterial'
        }, {
            name: 'Edit Recipes',
            view: 'editRecipes'
        }, {
            name: 'Select Plugin',
            view: 'pluginSelector'
        }]
    });

    workflowService.addWorkflow({
        name: 'makeTemperRecipes',
        label: 'Make Temper Recipes',
        image: `${modulePath}/resources/images/Recipe.png`,
        games: [xelib.gmTES5, xelib.gmSSE],
        start: (scope) => startWorkflow(scope, /*makeTemperRecipes*/ true),
        finish: finishWorkflow,
        stages: [{
            name: 'Select Material',
            view: 'selectRecipeMaterial'
        }, {
            name: 'Edit Temper Recipes',
            view: 'editRecipes'
        }, {
            name: 'Select Plugin',
            view: 'pluginSelector'
        }]
    });
});