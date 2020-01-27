ngapp.run(function(workflowService) {
    workflowService.addView('setWeaponAttributes', {
        templateUrl: `${moduleUrl}/partials/setWeaponAttributes.html`,
        validate: () => false
    });
});