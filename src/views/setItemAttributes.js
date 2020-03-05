ngapp.run(function(workflowService) {
    let setAttribute = function(...keys) {
        let setDeep = function(obj, val, keys) {
            if (keys.length > 1) {
                const key = keys.shift();
                if (!obj[key]) {
                    obj[key] = {};
                }
                setDeep(obj[key], val, keys);
            }
            else if (keys.length === 1) {
                obj[keys[0]] = val;
            }
        };
        return function(recordObject, value) {
            setDeep(recordObject, value, keys);
        };
    };

    const attributes = {
        /*equipType: {
            addToRecordObject: setAttribute('ETYP')
        },
        blockBashImpactDataSet: {
            addToRecordObject: setAttribute('BIDS')
        },
        alternateBlockMaterial: {
            addToRecordObject: setAttribute('BAMT')
        },
        keywords: {
            addToRecordObject: setAttribute('KWDA')
        },
        impactDataSet: {
            addToRecordObject: setAttribute('INAM')
        },
        nif1st: {
            addToRecordObject: setAttribute('WNAM')
        },
        attackFailSound: {
            addToRecordObject: setAttribute('TNAM')
        },
        equipSound: {
            addToRecordObject: setAttribute('NAM9')
        },
        unequipSound: {
            addToRecordObject: setAttribute('NAM8')
        },*/
        goldValue: {
            addToRecordObject: setAttribute('DATA', 'Value'),
            getDefaultValue: function() {
                return 0;
            }
        },
        weight: {
            addToRecordObject: setAttribute('DATA', 'Weight'),
            getDefaultValue: function() {
                return 0;
            }
        },
        damage: {
            addToRecordObject: setAttribute('DATA', 'Damage'),
            getDefaultValue: function() {
                return 0;
            }
        }/*,
        animationType: {
            addToRecordObject: setAttribute('DNAM', 'Animation Type')
        },
        speed: {
            addToRecordObject: setAttribute('DNAM', 'Speed')
        },
        reach: {
            addToRecordObject: setAttribute('DNAM', 'Reach')
        },
        stagger: {
            addToRecordObject: setAttribute('DNAM', 'Stagger')
        },
        criticalDamage: {
            addToRecordObject: setAttribute('CRDT', 'Damage')
        },
        percentMultiplier: {
            addToRecordObject: setAttribute('CRDT', '% Mult')
        }*/
    };

    let getAttributeValue = function(attributeName, modelAttributes) {
        const modelValue = modelAttributes[attributeName];
        return modelValue !== undefined ? modelValue : attributes[attributeName].getDefaultValue();
    };

    let setItemAttributesController = function($scope) {
        if (!$scope.model.attributes) {
            $scope.model.attributes = {};
        }

        $scope.attributes = Object.keys(attributes).reduce((attributes, attributeName) => {
            Object.defineProperty(attributes, attributeName, {
                get() {
                    return getAttributeValue(attributeName, $scope.model.attributes);
                },
                set(value) {
                    $scope.model.attributes[attributeName] = value;
                }
            });
            return attributes;
        }, {});
    };

    workflowService.addView('setItemAttributes', {
        templateUrl: `${moduleUrl}/partials/views/setItemAttributes.html`,
        controller: setItemAttributesController,
        process: function(input, model) {
            return Object.keys(attributes).reduce((attributes, attributeName) => {
                attributes[attributeName] = getAttributeValue(attributeName, model.attributes);
                return attributes;
            }, {});
        }
    });
});
