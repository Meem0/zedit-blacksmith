/* global ngapp, xelib, modulePath */
//=require src/**/*.js

ngapp.run(function(
    settingsService,
    contextMenuFactory,
    pluginTransformService,
    recordDependencyService,
    transformBuilderService,
    blacksmithHelpersService,
    editModalFactory,
    workflowService
    ) {
    contextMenuFactory.treeViewItems.push({
        visible: (scope, items) => items.length > 0 && !items.last().divider,
        build: (scope, items) => items.push({ divider: true })
    });

    contextMenuFactory.treeViewItems.push({
        visible: (scope) => true,
        build: (scope, items) => {
            let fileFilters = [{
                name: 'JSON file',
                extensions: ['json']
            }];

            let blacksmithDebug = {
                label: 'Debug',
                callback: () => {
                    try {
                        let selectedNode = scope.selectedNodes[0];
                        if (scope.selectedNodes.length > 1) {
                            let records = [];
                            for (const {handle} of scope.selectedNodes) {
                                if (blacksmithHelpersService.isMainRecord(handle)) {
                                    records.push(blacksmithHelpersService.elementToObject(handle));
                                }
                            }
                            debugger;
                            const dependencies = recordDependencyService.getDependencies(records);
                            console.log(dependencies);
                        }
                        else if (selectedNode) {
                            let controlFlag = 3;
                            debugger;
                            if (controlFlag === 1) {
                                transformBuilderService.buildTransformsFromModifiedElements();
                            }
                            else if (controlFlag === 2) {
                                if (blacksmithHelpersService.isValidElement(selectedNode.handle)) {
                                    debugger;
                                }
                            }
                            else if (controlFlag === 3) {
                                const customObject = blacksmithHelpersService.elementToObject(selectedNode.handle);
                                const xelibObject = xelib.ElementToObject(selectedNode.handle);
                                console.log(customObject);
                                console.log(xelibObject);
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

            let blacksmithOpenWorkflow = {
                label: 'Open workflow',
                callback: () => scope.$emit('openModal', 'workflow', {
                    basePath: `${moduleUrl}/../workflowSystem/partials`
                })
            };

            let blacksmithCreateTransforms = {
                label: 'Create transforms from modified elements',
                callback: () => {
                    try {
                        const selectedFile = fh.saveFile('Select transform file', modulePath, fileFilters);
                        if (selectedFile) {
                            const transforms = transformBuilderService.buildTransformsFromModifiedElements();
                            fh.saveJsonFile(selectedFile, transforms, false);
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

            let blacksmithLoadTransforms = {
                label: 'Load transforms',
                callback: () => {
                    const selectedFile = fh.selectFile('Select transform file', modulePath, fileFilters);
                    if (!selectedFile) {
                        return;
                    }
                    const transforms = fh.loadJsonFile(selectedFile);
                    if (!transforms) {
                        blacksmithHelpersService.logWarn(`Could not find file ${selectedFile}`);
                        return;
                    }
                    editModalFactory.addFile(scope, addedFilename => {
                        xelib.WithHandle(
                            xelib.AddFile(addedFilename),
                            fileHandle => {
                                try {
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
                            const selectedInputFile = fh.selectFile('Select input transform file', modulePath, fileFilters);
                            if (!selectedInputFile) {
                                return;
                            }
                            let transforms = fh.loadJsonFile(selectedInputFile);
                            if (!transforms) {
                                transforms = [];
                            }
                            const recordObject = xelib.ElementToObject(selectedNode.handle);
                            recordObject['Record Header']['FormID'] = '';
                            transforms.push({
                                base: '',
                                delta: recordObject
                            });
                            const selectedOutputFile = fh.selectFile('Select output transform file', modulePath, fileFilters);
                            if (!selectedOutputFile) {
                                return;
                            }
                            fh.saveJsonFile(selectedOutputFile, transforms, false);
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
            if (settingsService.settings.blacksmith.debugMode) {
                blacksmithChildren.push(blacksmithDebug);
            }
            blacksmithChildren.push(blacksmithOpenWorkflow);
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
