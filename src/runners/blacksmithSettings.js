module.exports = ({ngapp, modulePath}) => {

ngapp.controller('blacksmithSettingsController', function($scope) {
});

ngapp.run(function($rootScope, settingsService) {
    settingsService.registerSettings({
        label: 'Blacksmith',
        templateUrl: `${modulePath}/partials/blacksmithSettings.html`,
        controller: 'blacksmithSettingsController',
        defaultSettings: {
            blacksmith: {
                debugMode: false
            }
        }
    });
});

}
