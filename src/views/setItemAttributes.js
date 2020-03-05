ngapp.run(function(workflowService) {
    let setAttribute = function(...keys) {
        return function(recordObject, value) {
            if (keys.length > 1) {
                const key = keys.shift();
                if (!recordObject[key]) {
                    recordObject[key] = {};
                }
                setDeep(recordObject[key], value, ...keys);
            }
            else if (keys.length === 1) {
                recordObject[keys[0]] = value;
            }
        };
    };

    const attributes = {
        nif: {
            addToRecordObject: setAttribute('Model', 'MODL')
        },
        equipType: {
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
        },
        goldValue: {
            addToRecordObject: setAttribute('DATA', 'Value')
        },
        weight: {
            addToRecordObject: setAttribute('DATA', 'Weight')
        },
        damage: {
            addToRecordObject: setAttribute('DATA', 'Damage')
        },
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
        }
    };

    let setItemAttributesController = function($scope) {

    };

    workflowService.addView('setItemAttributes', {
        templateUrl: `${moduleUrl}/partials/views/setItemAttributes.html`,
        controller: setItemAttributesController,
        process: function(input, model) {
            let outputAttributes = {};

            // add default attributes to output
            // override with model

            // Object.keys(model.attributes).forEach(attribute => outputAttributes[attribute]);
        }
    });
});
