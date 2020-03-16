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
        if (attribute && attribute.getValue) {
            const itemAttributeProperties = skyrimGearService.getAttributeProperties(itemType, attributeName);
            const materialAttributeProperties = skyrimMaterialService.getAttributeProperties(material, attributeName);
            if (itemAttributeProperties && materialAttributeProperties) {
                return attribute.getValue(itemAttributeProperties, materialAttributeProperties);
            }
        }
    };
});
