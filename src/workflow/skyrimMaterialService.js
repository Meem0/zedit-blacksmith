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

    this.getComponentsForMaterial = function(material) {
        return materials[material] ? materials[material].components : [];
    };
    
    // get an array with the maximum set of component types across all materials, including duplicate component types
    // e.g. ["Primary", "Major", "Major", "Binding", "Minor"]
    this.getComponentTypes = function() {
        const componentCounts = Object.values(materials).reduce((componentCounts, {components}) => {
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
});
