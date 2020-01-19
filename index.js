/* global ngapp, xelib, modulePath */
//= require ./src/*.js

ngapp.run(function(
    settingsService,
    contextMenuFactory,
    pluginTransformService,
    writeObjectToElementService,
    recordDependencyService,
    transformBuilderService,
    blacksmithHelpersService,
    editModalFactory
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
        visible: (scope, items) => items.length > 0 && !items.last().divider,
        build: (scope, items) => items.push({ divider: true })
    });

    contextMenuFactory.treeViewItems.push({
        visible: (scope) => true,
        build: (scope, items) => {
            let blacksmithDebug = {
                label: 'Debug',
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
            };

            let blacksmithCreateTransforms = {
                label: 'Create transforms from modified elements',
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
            };

            let blacksmithLoadTransforms = {
                label: 'Load transforms',
                callback: () => {
                    editModalFactory.addFile(scope, addedFilename => {
                        xelib.WithHandle(
                            xelib.AddFile(addedFilename),
                            fileHandle => {
                                try {
                                    const transforms = fh.loadJsonFile('./transforms.json');
                                    pluginTransformService.writeTransforms(fileHandle, transforms);
                                }
                                catch (ex) {
                                    debugger;
                                }
                                finally {
                                    scope.$root.$broadcast('reloadGUI');
                                }
                            }
                        );
                    });
                }
            };

            let blacksmithAddToTransform = {
                label: 'Add record to transforms',
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
            };

            let blacksmithChildren = [];
            blacksmithChildren.push(blacksmithDebug);
            blacksmithChildren.push(blacksmithCreateTransforms);
            blacksmithChildren.push(blacksmithLoadTransforms);
            if (scope.selectedNodes.length === 1 && blacksmithHelpersService.isMainRecord(scope.selectedNodes[0].handle)) {
                blacksmithChildren.push(blacksmithAddToTransform);
            }

            items.push({
                label: "Blacksmith",
                children: blacksmithChildren
            });
        }
    });
});
