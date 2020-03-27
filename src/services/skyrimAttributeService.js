ngapp.service('skyrimAttributeService', function(skyrimGearService, skyrimMaterialService) {
    let roundToN = function(num, n) {
        return Math.round(num / n) * n;
    };

    let weaponAttributes = {
        damage: {
            getValue: function({base, tierMult}, {tierValue}) {
                return Math.floor(base + tierMult * tierValue);
            },
            keyPath: ['DATA', 'Damage']
        },
        goldValue: {
            getValue: function({tierMult}, {tierValue}) {
                return roundToN(tierMult * tierValue, 5);
            },
            keyPath: ['DATA', 'Value']
        },
        weight: {
            getValue: function({base, tierMult}, {tierValue}) {
                return base + tierMult * tierValue;
            },
            keyPath: ['DATA', 'Weight']
        },
        critDamage: {
            getValue: function({base, tierMult}, {tierValue}) {
                return Math.round(base + tierMult * tierValue);
            },
            keyPath: ['CRDT', 'Damage']
        },
        equipType: {
            keyPath: ['ETYP']
        },
        blockBashImpactDataSet: {
            keyPath: ['BIDS']
        },
        alternateBlockMaterial: {
            keyPath: ['BAMT']
        },
        description: {
            value: '',
            keyPath: ['DESC']
        },
        impactDataSet: {
            keyPath: ['INAM']
        },
        attackFailSound: {
            keyPath: ['TNAM']
        },
        equipSound: {
            keyPath: ['NAM9']
        },
        unequipSound: {
            keyPath: ['NAM8']
        },
        animationType: {
            keyPath: ['DNAM', 'Animation Type']
        },
        speed: {
            keyPath: ['DNAM', 'Speed']
        },
        reach: {
            keyPath: ['DNAM', 'Reach']
        },
        skill: {
            keyPath: ['DNAM', 'Skill']
        },
        stagger: {
            keyPath: ['DNAM', 'Stagger']
        },
        dataUnused: {
            value: '00 00',
            keyPath: ['DNAM', 'Unused']
        },
        sightFOV: {
            value: 0,
            keyPath: ['DNAM', 'Sight FOV']
        },
        dataUnknown: {
            value: '00 00 00 00',
            keyPath: ['DNAM', 'Unknown']
        },
        baseVATSChance: {
            value: 0,
            keyPath: ['DNAM', 'Base VATS To-Hit Chance']
        },
        attackAnimation: {
            value: 255,
            keyPath: ['DNAM', 'Attack Animation']
        },
        numProjectiles: {
            value: 1,
            keyPath: ['DNAM', '# Projectiles']
        },
        embeddedWeaponAV: {
            value: 0,
            keyPath: ['DNAM', 'Embedded Weapon AV (unused)']
        },
        rangeMin: {
            value: 0,
            keyPath: ['DNAM', 'Range Min']
        },
        rangeMax: {
            value: 0,
            keyPath: ['DNAM', 'Range Max']
        },
        onHit: {
            value: 0,
            keyPath: ['DNAM', 'On Hit']
        },
        animationAttackMult: {
            value: 1,
            keyPath: ['DNAM', 'Animation Attack Mult']
        },
        rumbleLeft: {
            value: 0.5,
            keyPath: ['DNAM', 'Rumble - Left Motor Strength']
        },
        rumbleRight: {
            value: 1,
            keyPath: ['DNAM', 'Rumble - Right Motor Strength']
        },
        rumbleDuration: {
            value: 0.33,
            keyPath: ['DNAM', 'Rumble - Duration']
        },
        resist: {
            value: -1,
            keyPath: ['DNAM', 'Resist']
        },
        critUnknown: {
            value: '00 00 00 00',
            keyPath: ['CRDT', 'Unknown']
        },
        critMult: {
            value: 1,
            keyPath: ['CRDT', '% Mult']
        },
        critFlags: {
            value: {'On Death': true},
            keyPath: ['CRDT', 'Flags']
        },
        critUnused: {
            value: '00 00 00',
            keyPath: ['CRDT', 'Unused']
        },
        detectionSoundLevel: {
            keyPath: ['VNAM']
        }
    };

    let attributesMap = {
        weapon: weaponAttributes
    };

    let getAttribute = function(gearCategory, attributeName) {
        const attributes = attributesMap[gearCategory];
        if (attributes) {
            return attributes[attributeName];
        }
    };

    this.getAttributeNames = function(gearCategory) {
        const attributes = attributesMap[gearCategory];
        if (attributes) {
            return Object.keys(attributes);
        }
    };

    this.getAttributeKeyPath = function(gearCategory, attributeName) {
        const attribute = getAttribute(gearCategory, attributeName);
        return attribute && attribute.keyPath;
    };

    this.getAttributeValue = function(gearCategory, attributeName, itemType, material) {
        const attribute = getAttribute(gearCategory, attributeName);
        if (attribute) {
            const itemAttributeProperties = skyrimGearService.getAttributeProperties(itemType, attributeName);
            const materialAttributeProperties = skyrimMaterialService.getAttributeProperties(material, attributeName);
            if (attribute.getValue && itemAttributeProperties && materialAttributeProperties) {
                return attribute.getValue(itemAttributeProperties, materialAttributeProperties);
            }
            else if (itemAttributeProperties !== undefined && typeof(itemAttributeProperties) !== 'object') {
                return itemAttributeProperties;
            }

            if (attribute.value !== undefined) {
                return attribute.value;
            }
        }
    };
});
