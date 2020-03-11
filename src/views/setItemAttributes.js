ngapp.run(function(workflowService) {
    const weaponAttributeDefinitions = {
        /*equipType: {
            keyPath: ['ETYP']
        },
        blockBashImpactDataSet: {
            keyPath: ['BIDS']
        },
        alternateBlockMaterial: {
            keyPath: ['BAMT']
        },
        keywords: {
            keyPath: ['KWDA']
        },
        impactDataSet: {
            keyPath: ['INAM']
        },
        nif1st: {
            keyPath: ['WNAM']
        },
        attackFailSound: {
            keyPath: ['TNAM']
        },
        equipSound: {
            keyPath: ['NAM9']
        },
        unequipSound: {
            keyPath: ['NAM8']
        },*/
        goldValue: {
            keyPath: ['DATA', 'Value'],
            getDefaultValue: function() {
                return 0;
            }
        },
        weight: {
            keyPath: ['DATA', 'Weight'],
            getDefaultValue: function() {
                return 0;
            }
        },
        damage: {
            keyPath: ['DATA', 'Damage'],
            getDefaultValue: function() {
                return 0;
            }
        }/*,
        animationType: {
            keyPath: ['DNAM', 'Animation Type']
        },
        speed: {
            keyPath: ['DNAM', 'Speed']
        },
        reach: {
            keyPath: ['DNAM', 'Reach']
        },
        stagger: {
            keyPath: ['DNAM', 'Stagger']
        },
        criticalDamage: {
            keyPath: ['CRDT', 'Damage']
        },
        percentMultiplier: {
            keyPath: ['CRDT', '% Mult']
        }*/
    };

    const gearAttributeDefinitionsMap = {
        weapon: weaponAttributeDefinitions
    };

    let getAttributeDefaultValue = function(attributeName, gearCategory) {
        const gearAttributeDefinitions = gearAttributeDefinitionsMap[gearCategory];
        if (gearAttributeDefinitions) {
            const attributeDefinition = gearAttributeDefinitions[attributeName];
            if (attributeDefinition) {
                return attributeDefinition.getDefaultValue();
            }
        }
    };

    // get the value for attributeName from attributeValues, or fall back to the attribute definition's default value
    let getAttributeValue = function(attributeName, attributeValues, gearCategory) {
        const attributeValue = attributeValues ? attributeValues[attributeName] : undefined;
        return attributeValue !== undefined ? attributeValue : getAttributeDefaultValue(attributeName, gearCategory);
    };

    let setItemAttributesController = function($scope) {
        debugger;

        // const itemAttributeValues = $scope.model.itemAttributeValues;
        // const attributeValues = itemAttributeValues[itemEditorId];
        // const attributeValue = attributeValues[attributeName];
        if (!$scope.model.itemAttributeValues) {
            $scope.model.itemAttributeValues = {};
        }

        const gearAttributeDefinitions = gearAttributeDefinitionsMap[$scope.input.gearCategory];
        if (gearAttributeDefinitions) {
            // build a scope object that will write to the model.itemAttributeValues
            // and read from model.itemAttributeValues or the attribute definition's default value
            $scope.itemAttributeValuesArray = $scope.input.items.map(({name, editorId}) => ({
                name,
                editorId,
                attributeValues: Object.keys(gearAttributeDefinitions).reduce((attributeValues, attributeName) => {
                    Object.defineProperty(attributeValues, attributeName, {
                        get() {
                            return getAttributeValue(attributeName, $scope.model.itemAttributeValues[editorId], $scope.input.gearCategory);
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
            const gearAttributeDefinitions = gearAttributeDefinitionsMap[input.gearCategory];
            if (gearAttributeDefinitions) {
                return {
                    items: input.items.map(item => ({
                        ...item,
                        attributes: Object.keys(gearAttributeDefinitions).reduce((attributes, attributeName) => {
                            const attributeDefinition = gearAttributeDefinitions[attributeName];
                            if (attributeDefinition && attributeDefinition.keyPath) {
                                const attributeValues = model.itemAttributeValues ? model.itemAttributeValues[item.editorId] : undefined;
                                attributes[attributeName] = {
                                    keyPath: attributeDefinition.keyPath,
                                    value: getAttributeValue(attributeName, attributeValues, input.gearCategory)
                                };
                            }
                            return attributes;
                        }, {})
                    }))
                };
            }
        }
    });
});
