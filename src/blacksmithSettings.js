ngapp.controller('blacksmithSettingsController', function($scope) {
});

ngapp.run(function($rootScope, settingsService) {
    settingsService.registerSettings({
        label: 'Blacksmith',
        templateUrl: `${modulePath}/partials/blacksmithSettings.html`,
        controller: 'blacksmithSettingsController',
        defaultSettings: {
            blacksmith: {
                debugMode: false,
                fileDirectory: '\\resources\\',
                getFilePath(filename) {
                    return `${modulePath}${this.fileDirectory}${filename}`;
                }
            }
        }
    });
});
