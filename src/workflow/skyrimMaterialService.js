ngapp.service('skyrimMaterialService', function() {
    let materialTypes = fh.loadJsonFile(`${modulePath}/resources/materialTypes.json`);

    this.getMaterials = function() {
        return Object.keys(materialTypes).reduce((materials, filename) => {
            if (xelib.HasElement(0, filename)) {
                materials = materials.concat(materialTypes[filename]);
            }
            return materials;
        }, []);
    };
});
