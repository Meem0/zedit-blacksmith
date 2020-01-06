ngapp.controller('blacksmithSettingsController', function($scope) {
    $scope.printMessage = function() {
        console.log($scope.settings.blacksmithModule.message);
    };
});
