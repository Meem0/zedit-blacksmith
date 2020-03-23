let blacksmithHelpers = require('../lib/blacksmithHelpers');
let generateTestCases = function() {
    let gearCategorySignatures = {
        'armor': 'ARMO',
        'weapon': 'WEAP'
    };
    let searchFiles = [{
        filename: 'Skyrim.esm',
        formatEditorId: editorId => editorId
    }, {
        filename: 'Dawnguard.esm',
        formatEditorId: editorId => `DLC1${editorId}`
    }];
    Object.values(gearCategorySignatures).forEach(signature => {
        searchFiles.forEach(({filename}) => xelib.SortEditorIDs(filename, signature));
    });

    let getItemRecord = function(material, itemType, gearCategory) {
        let prefix = '';
        let suffix = '';
        if (gearCategory === 'armor') {
            prefix = 'Armor';
            if (material === 'Steel' && itemType !== 'Shield') {
                suffix = 'A';
            }
            if (material === 'Dragonbone') {
                material = 'Dragonplate';
            }
        }
        itemType = itemType === 'Armor' ? 'Cuirass' : itemType.replace(/\s/g, '');
        const baseEditorId = prefix + material + itemType + suffix;
        for ({filename, formatEditorId} of searchFiles) {
            const editorId = formatEditorId(baseEditorId);
            const itemPath = `${filename}\\${gearCategorySignatures[gearCategory]}\\${editorId}`;
            const id = xelib.GetElement(0, itemPath);
            if (id) {
                return id;
            }
        }
    };

    let getResources = function(folderPath) {
        return fh.jetpack.find(folderPath, {matching: ['*.json']}).map(path => fh.jetpack.read(path, 'json'));
    };

    let gearTypes = getResources('resources/gear').map(({name, gearCategory}) => ({
        gearName: name,
        gearCategory
    }));
    let materials = getResources('resources/materials').map(({name, keywords}) => {
        const gearCategories = [];
        if (keywords.some(keyword => keyword.includes('Armor'))) {
            gearCategories.push('armor');
        }
        if (keywords.some(keyword => keyword.includes('Weap'))) {
            gearCategories.push('weapon');
        }
        return {
            materialName: name,
            gearCategories
        };
    });

    let testCases = [];
    materials.forEach(({materialName, gearCategories}) => gearTypes.forEach(({gearName, gearCategory}) => {
        if (!gearCategories.includes(gearCategory)) {
            return;
        }

        let reference;
        xelib.WithHandle(getItemRecord(materialName, gearName, gearCategory), id => {
            if (id) {
                reference = blacksmithHelpers.getReferenceFromRecord(id);
            }
        });
        testCases.push({
            material: materialName,
            itemType: gearName,
            gearCategory,
            reference: reference || 'ERROR'
        });
    }));
    return testCases;
};

const testCases = generateTestCases();
fh.jetpack.write('test/testCases.json', testCases);

testCases.forEach(testCase => {
    test(`${testCase.material} ${testCase.itemType}`, function() {
        expect(testCase.reference).toBeTruthy();
        expect(testCase.reference).not.toEqual('ERROR');
    });
});
