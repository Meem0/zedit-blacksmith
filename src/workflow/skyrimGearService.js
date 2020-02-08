ngapp.service('skyrimGearService', function(blacksmithHelpersService) {
    let armorTypes = fh.loadJsonFile(`${modulePath}/resources/armorTypes.json`);
    let weaponTypes = fh.loadJsonFile(`${modulePath}/resources/weaponTypes.json`);
    let itemTypes = Object.assign({}, armorTypes, weaponTypes);

    this.getItemTypeKeywords = function() {
        return Object.values(itemTypes).reduce((itemTypeKeywords, {keywords}) => itemTypeKeywords.concat(keywords), []);
    };

    this.getItemTypeForKeyword = function(keyword) {
        return Object.keys(itemTypes).find(key => itemTypes[key].keywords.includes(keyword));
    };
});
