ngapp.service('skyrimGearService', function() {
    let armorTypes = fh.loadJsonFile(`${modulePath}/resources/armorTypes.json`);
    let weaponTypes = fh.loadJsonFile(`${modulePath}/resources/weaponTypes.json`);
    let itemTypes = Object.assign({}, armorTypes, weaponTypes);
    let recipeItemTypes = fh.loadJsonFile(`${modulePath}/resources/recipeItemTypes.json`);

    this.getItemTypeKeywords = function() {
        return Object.values(itemTypes).reduce((itemTypeKeywords, {keywords}) => itemTypeKeywords.concat(keywords), []);
    };

    this.getItemTypeForKeyword = function(keyword) {
        return Object.keys(itemTypes).find(key => itemTypes[key].keywords.includes(keyword));
    };

    let getItemRecipeDefinition = function(itemType, componentClass) {
        let recipeDefinition = recipeItemTypes[itemType];
        if (recipeDefinition && recipeDefinition.classes) {
            return recipeDefinition.classes[componentClass];
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
