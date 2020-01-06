/* global ngapp, xelib, modulePath */
//= require ./src/*.js

ngapp.run(function(settingsService, contextMenuFactory, pluginTransformService) {
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
                        let shortcutObj = pluginTransformService.ElementToObjectWithShortcuts(selectedNode.handle);
                        debugger;
                    }
                }
            });
        }
    });
});
