/* global ngapp, xelib, modulePath */
//= require ./src/*.js

ngapp.run(function(settingsService) {
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
});
