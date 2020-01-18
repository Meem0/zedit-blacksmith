/* global ngapp, xelib, modulePath */
//= require ./src/*.js

ngapp.run(function(
    settingsService,
    contextMenuFactory,
    pluginTransformService,
    writeObjectToElementService,
    recordDependencyService,
    transformBuilderService,
    blacksmithHelpersService
    ) {
    settingsService.registerSettings({
        label: 'Blacksmith',
        templateUrl: `${modulePath}/partials/blacksmithSettings.html`,
        controller: 'blacksmithSettingsController',
        defaultSettings: {
            blacksmithModule: {
                message: 'HI!'
            }
        }
    });

    contextMenuFactory.treeViewItems.push({
        id: 'Blacksmith',
        visible: (scope) => true,
        build: (scope, items) => {
            items.push({
                label: 'Blacksmith - Record Modified',
                callback: () => {
                    try {
                        const transforms = transformBuilderService.buildTransformsFromModifiedElements();
                        fh.saveJsonFile('./transforms.json', transforms, false);
                    }
                    catch (ex) {
                        debugger;
                    }
                    finally {
                        scope.$root.$broadcast('reloadGUI');
                    }
                }
            });
            items.push({
                label: 'Blacksmith - Write Transforms',
                callback: () => {
                    try {
                        let selectedNode = scope.selectedNodes[0];
                        if (selectedNode) {
                            const transforms = fh.loadJsonFile('./transforms.json');
                            pluginTransformService.writeTransforms(selectedNode.handle, transforms);
                        }
                    }
                    catch (ex) {
                        debugger;
                    }
                    finally {
                        scope.$root.$broadcast('reloadGUI');
                    }
                }
            });
            items.push({
                label: 'Blacksmith',
                callback: () => {
                    try {
                        let selectedNode = scope.selectedNodes[0];
                        if (scope.selectedNodes.length > 1) {
                            let records = [];
                            xelib.WithEachHandle(
                                scope.selectedNodes.map(node => node.handle),
                                nodeHandle => {
                                    if (xelib.SmashType(nodeHandle) === 1) {
                                        records.push(xelib.ElementToObject(nodeHandle));
                                    }
                                }
                            );
                            debugger;
                            const dependencies = recordDependencyService.getRecordObjectDependencies(records);
                            console.log(dependencies);
                        }
                        else if (selectedNode) {
                            let controlFlag = 3;
                            debugger;
                            if (controlFlag === 0) {
                                const elementObject = xelib.ElementToObject(selectedNode.handle);
                                fh.saveJsonFile('./obj.json', elementObject, false);
                            }
                            else if (controlFlag === 1) {
                                let obj = fh.loadJsonFile('./obj.json');
                                writeObjectToElementService.writeObjectToElement(selectedNode.handle, obj);
                            }
                            else if (controlFlag === 2) {
                                let transforms = fh.loadJsonFile('./transforms.json');
                                pluginTransformService.writeTransforms(selectedNode.handle, transforms);
                            }
                            else if (controlFlag === 3) {
                                transformBuilderService.buildTransformsFromModifiedElements();
                            }
                            else if (controlFlag === 4) {
                                if (blacksmithHelpersService.isValidElement(selectedNode.handle)) {
                                    debugger;
                                }
                            }
                        }
                    }
                    catch (ex) {
                        debugger;
                    }
                    finally {
                        scope.$root.$broadcast('reloadGUI');
                    }
                }
            });
        }
    });
});
