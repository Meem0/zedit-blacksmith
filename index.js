/* global ngapp, xelib, modulePath */
//= require ./src/*.js

ngapp.run(function(
    settingsService,
    contextMenuFactory,
    pluginTransformService,
    writeObjectToElementService,
    recordDependencyService
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
                label: 'Blacksmith',
                callback: () => {
                    let selectedNode = scope.selectedNodes[0];
                    if (scope.selectedNodes.length > 1) {
                        let recordPaths = [];
                        xelib.WithEachHandle(
                            scope.selectedNodes.map(node => node.handle),
                            nodeHandle => {
                                if (xelib.SmashType(nodeHandle) === 1) {
                                    recordPaths.push(xelib.Path(nodeHandle));
                                }
                            }
                        );
                        const dependencies = recordDependencyService.getDependencies(recordPaths);
                        console.log(dependencies);
                        console.log(dependencies.map(recordPath => xelib.WithHandle(xelib.GetElement(0, recordPath), id => xelib.LongName(id))));
                    }
                    else if (selectedNode) {
                        let controlFlag = 2;
                        debugger;
                        if (controlFlag === 0) {
                            const elementObject = xelib.ElementToObject(selectedNode.handle);
                            fh.saveJsonFile('./obj.json', elementObject, false);
                        }
                        else if (controlFlag === 1) {
                            let obj = fh.loadJsonFile('./obj.json');
                            try {
                                writeObjectToElementService.writeObjectToElement(selectedNode.handle, obj);
                            }
                            finally {
                                scope.$root.$broadcast('reloadGUI');
                            }
                        }
                        else if (controlFlag === 2) {
                            let transforms = fh.loadJsonFile('./transforms.json');
                            try {
                                pluginTransformService.writeTransforms(selectedNode.handle, transforms);
                            }
                            finally {
                                scope.$root.$broadcast('reloadGUI');
                            }
                        }
                    }
                }
            });
        }
    });
});
