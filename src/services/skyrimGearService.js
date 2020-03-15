ngapp.service('skyrimGearService', function(skyrimReferenceService) {
    let itemTypeDefinitions = fh.jetpack.find(`${modulePath}/resources/gear`, {matching: ['*.json']}).map(path => fh.loadJsonFile(path));

    this.getItemTypeKeywords = function() {
        return itemTypeDefinitions.reduce((itemTypeKeywords, {keywords}) => itemTypeKeywords.concat(keywords), []);
    };

    this.getItemTypeForKeyword = function(keyword) {
        const itemTypeDefinition = itemTypeDefinitions.find(({keywords}) => keywords.includes(keyword));
        return itemTypeDefinition ? itemTypeDefinition.name : '';
    };

    this.isArmor = function(itemType) {
        const itemTypeDefinition = itemTypeDefinitions.find(({name}) => name === itemType);
        return itemTypeDefinition && itemTypeDefinition.gearCategory === 'armor';
    };

    this.isWeapon = function(itemType) {
        const itemTypeDefinition = itemTypeDefinitions.find(({name}) => name === itemType);
        return itemTypeDefinition && itemTypeDefinition.gearCategory === 'weapon';
    };

    this.getItemTypesForGearCategory = function(gearCategory) {
        return itemTypeDefinitions.reduce((matchingItemTypes, itemTypeDefinition) => {
            if (itemTypeDefinition.gearCategory === gearCategory) {
                matchingItemTypes.push(itemTypeDefinition.name);
            }
            return matchingItemTypes;
        }, []);
    };

    let getItemRecipeDefinition = function(itemType, componentClass) {
        const itemTypeDefinition = itemTypeDefinitions.find(({name}) => name === itemType);
        const recipeDefinition = itemTypeDefinition && itemTypeDefinition.classes ? itemTypeDefinition.classes[componentClass] : itemTypeDefinition;
        if (recipeDefinition && recipeDefinition.additionalComponents) {
            recipeDefinition.additionalComponents = recipeDefinition.additionalComponents.map(({name, ...rest}) => ({
                itemReference: skyrimReferenceService.getReferenceFromName(name),
                ...rest
            }));
        }
        return recipeDefinition;
    };

    this.getRecipeComponentQuantity = function(itemType, componentType, componentClass) {
        const recipeDefinition = getItemRecipeDefinition(itemType, componentClass);
        if (!recipeDefinition || !recipeDefinition.componentSpecs) {
            return 0;
        }
        const component = recipeDefinition.componentSpecs.find(({type}) => type === componentType);
        return component ? component.count : 0;
    };

    this.getRecipeAdditionalComponents = function(itemType, componentClass) {
        const recipeDefinition = getItemRecipeDefinition(itemType, componentClass);
        if (!recipeDefinition || !recipeDefinition.additionalComponents) {
            return [];
        }
        return recipeDefinition.additionalComponents;
    };
});
