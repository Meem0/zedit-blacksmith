ngapp.service('skyrimMaterialService', function() {
    let materialTypes = fh.loadJsonFile(`${modulePath}/resources/materialTypes.json`);
    let materials = fh.loadJsonFile(`${modulePath}/resources/materials.json`);

    this.getMaterials = function() {
        return Object.keys(materialTypes).reduce((materials, filename) => {
            if (xelib.HasElement(0, filename)) {
                materials = materials.concat(materialTypes[filename]);
            }
            return materials;
        }, []);
    };

    this.getMaterialKeywords = function() {
        return Object.values(materials).reduce((materialKeywords, {keywords}) => materialKeywords.concat(keywords), []);
    };

    this.getMaterialForKeyword = function(keyword) {
        return Object.keys(materials).find(key => materials[key].keywords.includes(keyword));
    };
});
