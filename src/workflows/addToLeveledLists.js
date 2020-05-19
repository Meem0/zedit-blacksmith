module.exports = ({ngapp, xelib, modulePath}, blacksmithHelpers) =>
ngapp.run(function(workflowService) {
    let getOrAddOverrideLvliRecord = function(baseLvliRecord, targetPlugin) {
        const baseLvliFormID = xelib.GetHexFormID(baseLvliRecord);
        let overrideLvliRecord = xelib.GetElement(targetPlugin, baseLvliFormID);
        if (!overrideLvliRecord) {
            xelib.WithHandle(
                xelib.GetWinningOverride(baseLvliRecord),
                winningOverrideLvliRecord => {
                    overrideLvliRecord = xelib.CopyElement(winningOverrideLvliRecord, targetPlugin, /*asNew*/ false);
                }
            );
        }
        return overrideLvliRecord;
    };

    let shouldAddItemToLeveledList = function(itemReference, lvliRecord) {
        return !xelib.GetFlag(lvliRecord, 'LVLF', 'Special Loot') && !xelib.GetFlag(lvliRecord, 'LVLF', 'Use All');
    };

    let addItemWithTemplateToLeveledList = function({itemReference, templateItemFormId}, lvliRecord, targetPlugin) {
        if (!xelib.HasLeveledEntry(lvliRecord, templateItemFormId)) {
            return;
        }

        xelib.WithHandle(
            xelib.GetLeveledEntry(lvliRecord, templateItemFormId),
            templateLeveledEntry => {
                if (!templateLeveledEntry || !shouldAddItemToLeveledList(itemReference, lvliRecord)) {
                    return;
                }
                const itemFormId = blacksmithHelpers.getFormIdFromReference(itemReference);
                const templateItemLevel = xelib.GetValue(templateLeveledEntry, 'LVLO\\Level');
                const templateItemCount = xelib.GetValue(templateLeveledEntry, 'LVLO\\Count');
                xelib.WithHandle(
                    getOrAddOverrideLvliRecord(lvliRecord, targetPlugin),
                    overrideLvliRecord => {
                        xelib.Release(xelib.AddLeveledEntry(overrideLvliRecord, itemFormId, templateItemLevel, templateItemCount));
                    }
                );
            }
        );
    };

    let addItemsWithTemplatesToLeveledLists = function(inItemsWithTemplates, targetPlugin) {
        let itemsWithTemplates = inItemsWithTemplates.map(({itemReference, templateItemReference}) => ({
            itemReference,
            templateItemReference,
            templateItemFormId: blacksmithHelpers.getFormIdFromReference(templateItemReference)
        }));
        xelib.WithHandles(
            xelib.GetRecords(0, 'LVLI'),
            lvliRecords => {
                lvliRecords.forEach(lvliRecord => {
                    itemsWithTemplates.forEach(itemWithTemplate => {
                        addItemWithTemplateToLeveledList(itemWithTemplate, lvliRecord, targetPlugin);
                    });
                });
            }
        );
    };

    let getOrAddFile = function(filename) {
        let fileId = xelib.FileByName(filename);
        if (!fileId) {
            fileId = xelib.AddFile(filename);
        }
        return fileId;
    };

    const distributableItemSignatures = ['ARMO', 'WEAP'];

    let getItemsFromSelectedNodes = function(selectedNodes) {
        if (!selectedNodes) {
            return [];
        }

        return selectedNodes.reduce((items, {handle}) => {
            if (!blacksmithHelpers.isMainRecord(handle)) {
                return items;
            }
            if (!distributableItemSignatures.includes(xelib.Signature(handle))) {
                return items;
            }

            items.push({
                reference: blacksmithHelpers.getReferenceFromRecord(handle),
                get key() {
                    return this.reference;
                },
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

    let startWorkflow = function(input, scope) {
        let items = input.items;
        if (!items) {
            items = getItemsFromSelectedNodes(scope.selectedNodes);
        }
        return { items };
    };

    let finishWorkflow = function(model) {
        if (model && model.items && model.leveledListTemplateItems) {
            xelib.WithHandle(
                getOrAddFile(model.plugin),
                pluginId => {
                    xelib.AddAllMasters(pluginId);
                    let itemsToAdd = Object.entries(model.leveledListTemplateItems).reduce((itemsToAdd, [itemKey, templateItem]) => {
                        const item = model.items.find(({key}) => key === itemKey);
                        if (item && item.reference) {
                            itemsToAdd.push({
                                itemReference: item.reference,
                                templateItemReference: templateItem
                            });
                        }
                        return itemsToAdd;
                    }, []);
                    addItemsWithTemplatesToLeveledLists(itemsToAdd, pluginId);
                    xelib.CleanMasters(pluginId);
                }
            );
        }
    };

    workflowService.addWorkflow({
        name: 'addToLeveledLists',
        label: 'Distribute Random Loot',
        image: `${modulePath}/resources/images/Random.png`,
        games: [xelib.gmTES5, xelib.gmSSE],
        start: startWorkflow,
        finish: finishWorkflow,
        stages: [{
            name: 'Random Loot Distribution Options',
            view: 'leveledListOptions'
        }, {
            name: 'Select Plugin',
            view: 'pluginSelector'
        }]
    });
});
