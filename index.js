/* global ngapp, xelib, modulePath */
//= require ./src/*.js

ngapp.run(function(settingsService, contextMenuFactory, pluginTransformService, writeObjectToElementService) {
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
        visible: (scope) => {
            if (scope.selectedNodes.length === 1) {
                return true;
            }
            return false;
        },
        build: (scope, items) => {
            items.push({
                label: 'Blacksmith',
                callback: () => {
                    let selectedNode = scope.selectedNodes[0];
                    if (selectedNode)
                    {
                        let controlFlag = 1;
                        debugger;
                        if (controlFlag === 0)
                        {
                            let shortcutObj = pluginTransformService.elementToObjectWithShortcuts(selectedNode.handle);
                            let path = xelib.Path(selectedNode.handle);
                            let longPath = xelib.LongPath(selectedNode.handle);
                            let pathToUse = path;
                            let transformationObj = {
                                base: pathToUse,
                                delta: shortcutObj
                            };
                            fh.saveJsonFile('./obj.json', transformationObj, false);
                        }
                        else if (controlFlag === 1)
                        {
                            let obj = fh.loadJsonFile('./obj.json');
                            try {
                                writeObjectToElementService.writeObjectToElement(selectedNode.handle, obj);
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
