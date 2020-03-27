ngapp.service('skyrimMaterialService', function(skyrimReferenceService, jsonService) {
    let materialDefinitions = (jsonService.loadJsonFilesInFolder('materials')
        .map(({name, components, ...rest}) => ({
            name,
            components: components.map(({type, name}) => ({
                type,
                itemReference: skyrimReferenceService.getReferenceFromName(name)
            })),
            ...rest
        })));

    this.getMaterials = function() {
        return materialDefinitions.map(({name}) => name);
    };

    this.getMaterialKeywords = function() {
        return materialDefinitions.map(({name, keywords}) => ({
            material: name,
            keywords: Object.values(keywords).reduce((keywords, value) => keywords.concat(value), [])
        }));
    };

    this.getPrimaryKeywordForMaterial = function(material, gearCategory) {
        const materialDefinition = materialDefinitions.find(({name}) => name === material);
        if (materialDefinition) {
            const gearCategoryKeywords = materialDefinition.keywords[gearCategory];
            let gearCategoryKeyword = Array.isArray(gearCategoryKeywords) ? gearCategoryKeywords[0] : gearCategoryKeywords;
            if (gearCategoryKeyword) {
                return skyrimReferenceService.getReferenceFromName(gearCategoryKeyword);
            }
        }
    };

    // get an array with the maximum set of component types across all materials, including duplicate component types
    // e.g. ["Primary", "Major", "Major", "Binding", "Minor"]
    let getComponentTypes = function() {
        const componentCounts = materialDefinitions.reduce((componentCounts, {components}) => {
            components.forEach(component => {
                const numTypes = components.reduce((num, curComponent) => num + (curComponent.type === component.type ? 1 : 0), 0);
                componentCounts[component.type] = Math.max(numTypes, componentCounts[component.type] || 0);
            });
            return componentCounts;
        }, {});
        // at this point, componentCounts is e.g. {Primary: 1, Major: 2, Binding: 1, Minor: 1}
        return Object.entries(componentCounts).reduce((componentTypes, [componentType, count]) => {
            return componentTypes.concat(Array(count).fill(componentType));
        }, []);
    };

    this.getComponentsForMaterial = function(material, includePlaceholders = false) {
        const materialDefinition = materialDefinitions.find(({name}) => name === material);
        const materialComponents = materialDefinition ? materialDefinition.components : [];
        if (!includePlaceholders) {
            return materialComponents;
        }

        let componentSlots = getComponentTypes().map(componentType => ({
            type: componentType,
            itemReference: ''
        }));
        materialComponents.forEach(({type, itemReference}) => {
            for (let componentSlot of componentSlots) {
                if (componentSlot.type === type && !componentSlot.itemReference) {
                    componentSlot.itemReference = itemReference;
                    break;
                }
            }
        });
        return componentSlots;
    };

    this.getTemperIngredientForMaterial = function(material) {
        const components = this.getComponentsForMaterial(material);
        const primaryComponent = components.find(({type}) => type === 'Primary');
        return primaryComponent ? primaryComponent.itemReference : '';
    };

    this.getMaterialSmithingPerk = function(material) {
        const materialDefinition = materialDefinitions.find(({name}) => name === material);
        return materialDefinition ? skyrimReferenceService.getReferenceFromName(materialDefinition.perk) : '';
    };

    this.getMaterialClass = function(material) {
        const materialDefinition = materialDefinitions.find(({name}) => name === material);
        return materialDefinition ? materialDefinition.class : '';
    };

    this.getAttributeProperties = function(material, attributeName) {
        const materialDefinition = materialDefinitions.find(({name}) => name === material);
        return materialDefinition && materialDefinition[attributeName];
    };
});
