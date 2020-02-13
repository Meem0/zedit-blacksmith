ngapp.run(function(workflowService) {
    let selectRecipeMaterialController = function($scope) {
        debugger;
        $scope.selectItemGroup = function() {
            debugger;
            $scope.validateStage();
        };

        $scope.itemGroups = $scope.model.items.reduce((itemGroups, item) => {
            let itemGroup = itemGroups.find(({material}) => item.material === material);
            if (!itemGroup) {
                itemGroup = {
                    material: item.material,
                    items: []
                };
                itemGroups.push(itemGroup);
            }
            itemGroup.items.push(item);
            return itemGroups;
        }, []);
    };

    workflowService.addView('selectRecipeMaterial', {
        templateUrl: `${moduleUrl}/partials/selectRecipeMaterial.html`,
        controller: selectRecipeMaterialController,
        validate: model => model.material
    });
});