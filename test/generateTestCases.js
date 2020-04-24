let blacksmithHelpers = require('../lib/blacksmithHelpers')(zeditGlobals);
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
    const signaturesToSort = Object.values(gearCategorySignatures).concat('COBJ');
    signaturesToSort.forEach(signature => {
        searchFiles.forEach(({filename}) => xelib.SortEditorIDs(filename, signature));
    });

    let removeWhitespace = function(str) {
        return str.replace(/\s/g, '');
    };

    let findRecordForEditorId = function(editorId, signature) {
        for ({filename, formatEditorId} of searchFiles) {
            const formattedEditorId = formatEditorId(editorId);
            const itemPath = `${filename}\\${signature}\\${formattedEditorId}`;
            const id = xelib.GetElement(0, itemPath);
            if (id) {
                return id;
            }
        }
    };

    let buildItemEditorId = function(material, itemType, gearCategory) {
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
        itemType = itemType === 'Armor' ? 'Cuirass' : removeWhitespace(itemType);
        return prefix + material + itemType + suffix;
    };

    let buildRecipeEditorId = function(material, itemType, gearCategory, isTemper) {
        const recipeTypePrefix = isTemper ? 'Temper': 'Recipe';
        const recipePrefix = gearCategory === 'weapon' ? 'Weapon' : '';
        return recipeTypePrefix + recipePrefix + buildItemEditorId(material, itemType, gearCategory);
    };

    let getItemRecord = function(material, itemType, gearCategory) {
        const editorId = buildItemEditorId(material, itemType, gearCategory);
        return findRecordForEditorId(editorId, gearCategorySignatures[gearCategory]);
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
        Object.keys(gearCategorySignatures).forEach(gearCategory => {
            if (keywords[gearCategory]) {
                gearCategories.push(gearCategory);
            }
        });
        return {
            materialName: removeWhitespace(name),
            gearCategories
        };
    });

    let invalidCombinations = [{
        material: 'Leather',
        itemType: 'Shield',
    }, {
        material: 'Scaled',
        itemType: 'Shield',
    }, {
        material: 'SteelPlate',
        itemType: 'Shield'
    }, {
        material: 'Iron',
        itemType: 'Bow'
    }, {
        material: 'Steel',
        itemType: 'Bow'
    }];

    let testCases = [];
    materials.forEach(({materialName, gearCategories}) => gearTypes.forEach(({gearName, gearCategory}) => {
        if (!gearCategories.includes(gearCategory)) {
            return;
        }

        if (invalidCombinations.some(({material, itemType}) => material === materialName && itemType === gearName)) {
            return;
        }

        let reference;
        let recipeReference;
        let temperReference;
        xelib.WithHandle(getItemRecord(materialName, gearName, gearCategory), id => {
            if (id) {
                reference = blacksmithHelpers.getReferenceFromRecord(id);
                
                const recipeEditorId = buildRecipeEditorId(materialName, gearName, gearCategory, false);
                const temperEditorId = buildRecipeEditorId(materialName, gearName, gearCategory, true);
                recipeReference = xelib.WithHandle(
                    findRecordForEditorId(recipeEditorId, 'COBJ'),
                    id => blacksmithHelpers.getReferenceFromRecord(id)
                );
                temperReference = xelib.WithHandle(
                    findRecordForEditorId(temperEditorId, 'COBJ'),
                    id => blacksmithHelpers.getReferenceFromRecord(id)
                );
            }
        });
        testCases.push({
            material: materialName,
            itemType: gearName,
            gearCategory,
            reference: reference || 'ERROR',
            recipeReference: recipeReference || 'ERROR',
            temperReference: temperReference || 'ERROR'
        });
    }));
    return testCases;
};

afterAll(function() {
    console.log('afterAll - teardown xelib');
    xelib.Finalize();
});

const testCases = generateTestCases();
fh.jetpack.write('test/testCases.json', testCases);

testCases.forEach(testCase => {
    test(`item_reference ${testCase.material} ${testCase.itemType}`, function() {
        expect(testCase.reference).toBeTruthy();
        expect(testCase.reference).not.toEqual('ERROR');
    });
    test(`recipe_reference ${testCase.material} ${testCase.itemType}`, function() {
        expect(testCase.recipeReference).toBeTruthy();
        expect(testCase.recipeReference).not.toEqual('ERROR');
    });
    test(`recipe_reference ${testCase.material} ${testCase.itemType}`, function() {
        expect(testCase.temperReference).toBeTruthy();
        expect(testCase.temperReference).not.toEqual('ERROR');
    });
});
