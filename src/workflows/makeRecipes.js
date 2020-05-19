module.exports = ({ngapp, xelib, modulePath}, blacksmithHelpers) => {

ngapp.service('createRecipeRecordService', function(skyrimMaterialService, skyrimGearService) {
    const conditionFunctions = {
        EPTemperingItemIsEnchanted: {
            id: 659,
            usesBytesParams: true
        },
        HasPerk: {
            id: 448,
            usesBytesParams: false
        }
    };

    let createCondition = function({
        type = 0,
        comparisonValue = 1,
        func = '',
        parameter1 = 0,
        parameter2 = 0,
        runOn = 0,
        reference = 0,
        parameter3 = -1}) {
        ({id: funcId, usesBytesParams} = conditionFunctions[func]);
        if (usesBytesParams) {
            parameter1 = typeof(parameter1 === 'number') ? blacksmithHelpers.numberToBytes(parameter1) : parameter1;
            parameter2 = typeof(parameter2 === 'number') ? blacksmithHelpers.numberToBytes(parameter2) : parameter2;
        }
        return {
            "CTDA": {
                "Type": type,
                "Comparison Value": comparisonValue,
                "Function": funcId,
                "Parameter #1": parameter1,
                "Parameter #2": parameter2,
                "Run On": runOn,
                "Reference": reference,
                "Parameter #3": parameter3
            }
        };
    };

    let createRecipeObject = function({
        editorId,
        ingredients,
        createdObjectReference,
        workbenchReference,
        createdObjectCount,
        isTemper,
        perkReference
    }) {
        let sortedIngredients = ingredients.map(ingredient => ({
            editorId: blacksmithHelpers.withRecord(ingredient.itemReference, record => xelib.GetHexFormID(record, true, false)),
            ...ingredient
        })).sort((a, b) => a.editorId.localeCompare(b.editorId));
        let recipeObject = {
            "Record Header": {
                "Signature": "COBJ"
            },
            "EDID": editorId,
            "Items": sortedIngredients.map(ingredient => ({
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
            recipeObject["Conditions"] = [
                createCondition({
                    type: 33, // OR
                    comparisonValue: 1,
                    func: 'EPTemperingItemIsEnchanted'
                }),
                createCondition({
                    comparisonValue: 1,
                    func: 'HasPerk',
                    parameter1: 'Skyrim.esm:05218E' // ArcaneBlacksmith
                }),
            ];
        }
        else if (perkReference) {
            recipeObject["Conditions"] = [
                createCondition({
                    comparisonValue: 1,
                    func: 'HasPerk',
                    parameter1: perkReference
                })
            ];
        }
        return recipeObject;
    };

    let getWorkbenchReference = function(isTemper, itemType) {
        if (!isTemper) {
            return 'Skyrim.esm:088105';
        }
        return skyrimGearService.isWeapon(itemType) ? 'Skyrim.esm:088108' : 'Skyrim.esm:0ADB78';
    };

    this.createRecipeRecord = function(material, item, ingredients, isTemper, editorId = '') {
        let recipeProperties = {
            editorId,
            ingredients,
            createdObjectReference: item.reference,
            workbenchReference: getWorkbenchReference(isTemper, item.type),
            createdObjectCount: 1,
            isTemper
        };
        if (!isTemper) {
            recipeProperties.perkReference = skyrimMaterialService.getMaterialSmithingPerk(material);
        }
        return createRecipeObject(recipeProperties);
    };
});

ngapp.run(function(workflowService, createRecipeRecordService, skyrimMaterialService, skyrimGearService, writeObjectToElementService) {
    let getOrAddFile = function(filename) {
        let fileId = xelib.FileByName(filename);
        if (!fileId) {
            fileId = xelib.AddFile(filename);
        }
        return fileId;
    };

    let getItemMaterial = function(handle) {
        const materialKeywords = skyrimMaterialService.getMaterialKeywords();
        const materialKeyword = materialKeywords.find(({keywords}) => keywords.some(keyword => xelib.HasKeyword(handle, keyword)));
        return materialKeyword ? materialKeyword.material : '';
    };

    let getItemType = function(handle) {
        const itemTypeKeywords = skyrimGearService.getItemTypeKeywords();
        const itemTypeKeyword = itemTypeKeywords.find(({keyword}) => xelib.HasKeyword(handle, keyword));
        return itemTypeKeyword ? itemTypeKeyword.itemType : '';
    };

    let getRecipeEditorId = function(itemReference, isTemper) {
        const prefix = isTemper ? 'Temper' : 'Recipe';
        const itemEditorId = blacksmithHelpers.withRecord(itemReference, xelib.EditorID);
        return prefix + itemEditorId;
    };

    const constructibleItemSignatures = ['AMMO', 'ARMO', 'WEAP'];

    let getItemsFromSelectedNodes = function(selectedNodes) {
        if (!selectedNodes) {
            return [];
        }

        return selectedNodes.reduce((items, {handle}) => {
            if (!blacksmithHelpers.isMainRecord(handle)) {
                return items;
            }
            if (!constructibleItemSignatures.includes(xelib.Signature(handle))) {
                return items;
            }

            items.push({
                reference: blacksmithHelpers.getReferenceFromRecord(handle),
                type: getItemType(handle),
                material: getItemMaterial(handle),
                get name() {
                    return blacksmithHelpers.withRecord(this.reference, xelib.FullName) || '';
                },
                get editorId() {
                    return blacksmithHelpers.withRecord(this.reference, xelib.EditorID) || '';
                }
            });
            return items;
        }, []);
    };

    let startWorkflow = function(input, scope, makeTemperRecipes) {
        let items = input.items;
        if (!items) {
            items = getItemsFromSelectedNodes(scope.selectedNodes);
        }
        return {
            makeTemperRecipes: makeTemperRecipes,
            items
        };
    };

    let finishWorkflow = function(model) {
        if (model && model.recipes) {
            xelib.WithHandle(
                getOrAddFile(model.plugin),
                pluginId => {
                    xelib.AddAllMasters(pluginId);
                    model.recipes.forEach(({itemReference, ingredients}) => {
                        const editorId = getRecipeEditorId(itemReference, model.makeTemperRecipes);
                        const item = model.items.find(({reference}) => reference === itemReference);
                        const recipeObject = createRecipeRecordService.createRecipeRecord(
                            model.material,
                            item,
                            ingredients,
                            model.makeTemperRecipes,
                            editorId
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
        start: (input, scope) => startWorkflow(input, scope, /*makeTemperRecipes*/ true),
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
}
