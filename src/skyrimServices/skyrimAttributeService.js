module.exports = ({ngapp}) =>
ngapp.service('skyrimAttributeService', function(skyrimGearService, skyrimMaterialService, jsonService) {
    let attributeOverrides = jsonService.loadJsonFile('attributeOverrides')
        .reduce((attributeOverrides, {attribute, itemType, material, value}) => {
            let attributeOverrideList = attributeOverrides[attribute];
            if (!attributeOverrideList) {
                attributeOverrideList = [];
                attributeOverrides[attribute] = attributeOverrideList;
            }
            attributeOverrideList.push({itemType, material, value});
            return attributeOverrides;
        }, {});
    
    let getAttributeOverride = function(inAttributeName, inItemType, inMaterial) {
        const attributeOverrideList = attributeOverrides[inAttributeName];
        if (attributeOverrideList) {
            const attributeOverride = attributeOverrideList.find(({itemType, material}) => inItemType === itemType && inMaterial === material);
            if (attributeOverride) {
                return attributeOverride.value;
            }
        }
    };

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
        speed: {
            getValue: function({base, tierMult}, {tierValue}) {
                return Math.max(base + tierMult * tierValue, 0.5);
            },
            keyPath: ['DNAM', 'Speed']
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
        reach: {
            keyPath: ['DNAM', 'Reach']
        },
        skill: {
            keyPath: ['DNAM', 'Skill']
        },
        stagger: {
            keyPath: ['DNAM', 'Stagger']
        },
        sightFOV: {
            value: 0,
            keyPath: ['DNAM', 'Sight FOV']
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
        critMult: {
            value: 1,
            keyPath: ['CRDT', '% Mult']
        },
        critFlags: {
            value: {'On Death': true},
            keyPath: ['CRDT', 'Flags']
        },
        detectionSoundLevel: {
            keyPath: ['VNAM']
        }
    };

    let armorAttributes = {
        /*armorRating: {
            keyPath: ['DNAM']
        },
        goldValue: {
            keyPath: ['DATA', 'Value']
        },
        weight: {
            keyPath: ['DATA', 'Weight']
        },
        armorClass: {
            keyPath: ['BOD2', 'Armor Type']
        },
        generalFlags: {
            value: '',
            keyPath: ['BOD2', 'General Flags']
        },
        equipType: {
            keyPath: ['ETYP']
        },
        description: {
            value: '',
            keyPath: ['DESC']
        },
        blockBashImpactDataSet: {
            keyPath: ['BIDS']
        },
        alternateBlockMaterial: {
            keyPath: ['BAMT']
        },*/
        race: {
            value: 'Skyrim.esm:000019',
            keyPath: ['RNAM']
        }
    };

    let attributesMap = {
        weapon: weaponAttributes,
        armor: armorAttributes
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
            const attributeOverrideValue = getAttributeOverride(attributeName, itemType, material);
            if (attributeOverrideValue !== undefined) {
                return attributeOverrideValue;
            }

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
