ngapp.run(function(workflowService, blacksmithHelpersService, skyrimMaterialService, skyrimGearService, writeObjectToElementService) {
    let createRecipeObject = function(editorId, ingredients, perkReference, createdObjectReference, workbenchReference, createdObjectCount) {
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
        if (perkReference) {
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

    let startWorkflow = function(model, scope) {
        const selectedNodes = scope.modalOptions && Array.isArray(scope.modalOptions.selectedNodes) ? scope.modalOptions.selectedNodes : [];
        if (!model.items) {
            model.items = getItemsFromSelectedNodes(selectedNodes);
        }
    };

    let finishWorkflow = function(model) {
        if (model && model.recipes) {
            const perkReference = skyrimMaterialService.getMaterialSmithingPerk(model.material);
            const workbenchReference = 'Skyrim.esm:088105';
            xelib.WithHandle(
                getOrAddFile(model.plugin),
                pluginId => {
                    xelib.AddAllMasters(pluginId);
                    model.recipes.forEach(recipe => {
                        const recipeObject = createRecipeObject(
                            recipe.editorId,
                            recipe.ingredients,
                            perkReference,
                            recipe.item.reference,
                            workbenchReference,
                            1
                        );
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
        start: startWorkflow,
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
});