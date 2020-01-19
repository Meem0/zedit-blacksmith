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
                label: 'Blacksmith',
                callback: () => {
                    try {
                        let selectedNode = scope.selectedNodes[0];
                        if (scope.selectedNodes.length > 1) {
                            let records = [];
                            for (const {handle} of scope.selectedNodes) {
                                if (blacksmithHelpersService.isMainRecord(handle)) {
                                    records.push(xelib.ElementToObject(handle));
                                }
                            }
                            debugger;
                            const dependencies = recordDependencyService.getDependencies(records);
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

    contextMenuFactory.treeViewItems.push({
        id: 'BlacksmithPlugin',
        visible: (scope) => scope.selectedNodes.length === 1 && blacksmithHelpersService.isFile(scope.selectedNodes[0].handle),
        build: (scope, items) => {
            items.push({
                label: 'Blacksmith - Write Transforms',
                callback: () => {
                    try {
                        const selectedNode = scope.selectedNodes[0];
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
        }
    });

    contextMenuFactory.treeViewItems.push({
        id: 'BlacksmithRecord',
        visible: (scope) => scope.selectedNodes.length === 1 && blacksmithHelpersService.isMainRecord(scope.selectedNodes[0].handle),
        build: (scope, items) => {
            items.push({
                label: 'Blacksmith - Add Record to Transforms',
                callback: () => {
                    try {
                        const selectedNode = scope.selectedNodes[0];
                        if (selectedNode) {
                            const transforms = fh.loadJsonFile('./transforms.json');
                            const recordObject = xelib.ElementToObject(selectedNode.handle);
                            recordObject['Record Header']['FormID'] = '';
                            transforms.push({
                                base: '',
                                delta: recordObject
                            });
                            fh.saveJsonFile('./transforms.json', transforms, false);
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
