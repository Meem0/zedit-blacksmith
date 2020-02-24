ngapp.run(function(workflowService) {
    let selectRecipeMaterialController = function($scope) {
        $scope.itemGroups = $scope.input.items.reduce((itemGroups, item) => {
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
        requireInput: ['items'],
        process: function(input, model) {
            if (model.material && input.items) {
                if (input.items.some(({material}) => material === model.material)) {
                    return { material: model.material };
                }
            }
        }
    });
});
