ngapp.run(function(workflowService, skyrimMaterialService, writeObjectToElementService) {
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
        finish: finishWorkflow,
        stages: [{
            name: 'Select Plugin',
            view: 'pluginSelector'
        }, {
            name: 'Edit Recipes',
            view: 'editRecipes'
        }]
    });
});