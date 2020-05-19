module.exports = ({ngapp, xelib, modulePath}, blacksmithHelpers) =>
ngapp.run(function(workflowService) {
    let getDuplicateContainerEditorId = function(refrRecord, contRecord) {
        const refrReference = blacksmithHelpers.getReferenceFromRecord(refrRecord);

        const periodIndex = refrReference.lastIndexOf('.');
        const filename = periodIndex >= 0 ? refrReference.substring(0, periodIndex) : '';
        
        const colonIndex = refrReference.lastIndexOf(':');
        const localFormId = colonIndex >= 0 ? refrReference.substring(colonIndex + 1) : '';

        const contEdid = xelib.GetValue(contRecord, 'EDID');
        return `${contEdid}_${filename}_${localFormId}`;
    };

    let duplicateContainerInstance = function(containerRefr, targetPlugin) {
        return blacksmithHelpers.withRecord(containerRefr, refrRecord => {
            if (!refrRecord) {
                return;
            }
            return xelib.WithHandle(xelib.GetLinksTo(refrRecord, 'NAME'), contRecord => {
                if (!contRecord || xelib.Signature(contRecord) !== 'CONT') {
                    return;
                }
                return xelib.WithHandle(xelib.CopyElement(refrRecord, targetPlugin, /*asNew*/ false), refrOverrideRecord => {
                    const contCopyRecord = xelib.CopyElement(contRecord, targetPlugin, /*asNew*/ true);
                    const contCopyEdid = getDuplicateContainerEditorId(refrRecord, contRecord);
                    xelib.SetValue(contCopyRecord, 'EDID', contCopyEdid);
                    xelib.SetLinksTo(refrOverrideRecord, contCopyRecord, 'NAME');
                    return contCopyRecord;
                });
            });
        });
    };

    let addItemsToContainers = function(items, itemContainerMap, targetPlugin) {
        Object.entries(itemContainerMap).forEach(([itemKey, containerRefr]) => {
            const item = items.find(({key}) => key === itemKey);
            if (!item || !item.reference) {
                return;
            }
            xelib.WithHandle(duplicateContainerInstance(containerRefr, targetPlugin), contCopyRecord => {
                if (!contCopyRecord) {
                    return;
                }
                const itemFormId = blacksmithHelpers.withRecord(item.reference, xelib.GetHexFormID);
                if (itemFormId) {
                    xelib.AddItem(contCopyRecord, itemFormId, "1");
                }
            });
        });
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
        if (model && model.items && model.uniqueLootContainerInsertions) {
            xelib.WithHandle(
                getOrAddFile(model.plugin),
                pluginId => {
                    xelib.AddAllMasters(pluginId);
                    addItemsToContainers(model.items, model.uniqueLootContainerInsertions, pluginId);
                    xelib.CleanMasters(pluginId);
                }
            );
        }
    };

    workflowService.addWorkflow({
        name: 'distributeUniques',
        label: 'Distribute Unique Loot',
        image: `${modulePath}/resources/images/Chest.png`,
        games: [xelib.gmTES5, xelib.gmSSE],
        start: startWorkflow,
        finish: finishWorkflow,
        stages: [{
            name: 'Unique Loot Distribution Options',
            view: 'distributeUniquesOptions'
        }, {
            name: 'Select Plugin',
            view: 'pluginSelector'
        }]
    });
});
