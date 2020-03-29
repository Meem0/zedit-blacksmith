ngapp.run(function(workflowService, skyrimAttributeService) {
    // get the value for attributeName from attributeValues, or fall back to the attribute definition's default value
    let getAttributeValue = function(gearCategory, attributeName, itemType, material, attributeValues) {
        const attributeValue = attributeValues ? attributeValues[attributeName] : undefined;
        return attributeValue !== undefined ? attributeValue : skyrimAttributeService.getAttributeValue(gearCategory, attributeName, itemType, material);
    };

    let setItemAttributesController = function($scope) {
        if (!$scope.model.itemAttributeValues) {
            $scope.model.itemAttributeValues = {};
        }

        const attributeNames = skyrimAttributeService.getAttributeNames($scope.input.gearCategory);
        if (attributeNames) {
            // build a scope object that will write to the model.itemAttributeValues
            // and read from model.itemAttributeValues or the attribute definition's default value
            $scope.itemAttributeValuesArray = $scope.input.items.map(({name, editorId, type, material}) => ({
                name,
                editorId,
                attributeValues: attributeNames.reduce((attributeValues, attributeName) => {
                    Object.defineProperty(attributeValues, attributeName, {
                        get() {
                            return getAttributeValue(
                                $scope.input.gearCategory,
                                attributeName,
                                type,
                                material,
                                $scope.model.itemAttributeValues[editorId]
                            );
                        },
                        set(value) {
                            let modelAttributeValues = $scope.model.itemAttributeValues[editorId];
                            if (!modelAttributeValues) {
                                modelAttributeValues = {};
                                $scope.model.itemAttributeValues[editorId] = modelAttributeValues;
                            }
                            modelAttributeValues[attributeName] = value;
                        }
                    });
                    return attributeValues;
                }, {})
            }));
        }
    };

    workflowService.addView('setItemAttributes', {
        templateUrl: `${moduleUrl}/partials/views/setItemAttributes.html`,
        controller: setItemAttributesController,
        requireInput: ['gearCategory', 'items'],
        process: function(input, model) {
            const attributeNames = skyrimAttributeService.getAttributeNames(input.gearCategory);
            if (attributeNames) {
                return {
                    items: input.items.map(item => ({
                        ...item,
                        attributes: attributeNames.reduce((attributes, attributeName) => {
                            const attributeValues = model.itemAttributeValues ? model.itemAttributeValues[item.editorId] : undefined;
                            attributes[attributeName] = {
                                keyPath: skyrimAttributeService.getAttributeKeyPath(input.gearCategory, attributeName),
                                value: getAttributeValue(input.gearCategory, attributeName, item.type, item.material, attributeValues)
                            };
                            return attributes;
                        }, {})
                    }))
                };
            }
        }
    });
});
