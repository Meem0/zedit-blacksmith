ngapp.service('skyrimWeaponService', function() {
    let weaponTypes = fh.loadJsonFile(`${modulePath}/resources/weaponTypes.json`);

    this.getWeaponTypes = function() {
        return weaponTypes;
    };

    this.getWeaponAttributes = function(weaponType, material) {
        return {};
    };
});
