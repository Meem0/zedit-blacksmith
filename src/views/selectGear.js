ngapp.run(function(workflowService, skyrimGearService) {
    let getItemTypes = function(gearCategory) {
        return skyrimGearService.getItemTypesForGearCategory(gearCategory);
    };

    let selectGearController = function($scope) {
        $scope.addItem = function() {
            $scope.model.items.push({});
        };

        $scope.removeItem = function(item) {
            const index = $scope.model.items.indexOf(item);
            if (index >= 0) {
                $scope.model.items.splice(index, 1);
            }
        };

        $scope.itemTypes = getItemTypes($scope.input.gearCategory);

        if (!$scope.model.items) {
            $scope.model.items = [];
        }
    };

    workflowService.addView('selectGear', {
        templateUrl: `${moduleUrl}/partials/views/selectGear.html`,
        controller: selectGearController,
        requireInput: ['gearCategory'],
        process: function(input, model) {
            const itemTypes = getItemTypes(input.gearCategory);
            let gearSelections = [];
            if (model.items) {
                model.items.forEach(item => {
                    if (item.name
                        && itemTypes.includes(item.type)
                        && item.material
                        && item.nif) {
                        gearSelections.push(item);
                    }
                });
            }
            if (gearSelections.length > 0) {
                return {items: gearSelections};
            }
        }
    });
});
