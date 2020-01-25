ngapp.service('skyrimMaterialService', function() {
    let materialTypes = fh.loadJsonFile(`${modulePath}/resources/materialTypes.json`);

    this.getMaterials = function() {
        return materialTypes;
    };
});
