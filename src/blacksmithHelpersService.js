ngapp.service('blacksmithHelpersService', function(settingsService) {
    this.logInfo = function(msg, opts = {}) {
        if (settingsService.settings.blacksmith.debugMode) {
            blacksmithHelpers.logInfo(msg, opts);
        }
    };
});
