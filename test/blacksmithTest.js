let getShortKey = function (fullKey) {
    const matchResult = fullKey.match(/^([A-Z1-9][A-Z1-9][A-Z1-9][A-Z1-9]) - /);
    return (matchResult && matchResult[1]) || fullKey;
};

let blacksmithHelpers = require('../src/helpers/blacksmithHelpers')(zeditGlobals);
global.blacksmithHelpers = blacksmithHelpers;
const excludedKeys = ['Record Header', 'EDID', 'OBND', 'FULL', 'Model', 'KSIZ', 'COCT', 'WNAM', 'Unused', 'Unknown'];

let transformRecordObject = function(recordObject, transformedObject = {}, parentKey = '') {
    let transformRecordValue = function(value) {
        if (typeof(value) === 'number') {
            return Math.round(value * 100000) / 100000;
        }
        else if (typeof(value) === 'string') {
            const longName = blacksmithHelpers.withRecord(value, xelib.LongName);
            return longName || value;
        }
        else if (Array.isArray(value)) {
            return value.map(transformRecordValue);
        }
        else if (typeof(value) === 'object') {
            return transformRecordObject(value);
        }
        return value;
    };

    Object.entries(recordObject).forEach(([key, value]) => {
        const shortKey = getShortKey(key);
        if (!excludedKeys.includes(shortKey)) {
            let keyPath = shortKey;
            if (parentKey) {
                keyPath = `${parentKey}\\${shortKey}`;
            }
            if (typeof(value) !== 'object' || Array.isArray(value)) {
                transformedObject[keyPath] = transformRecordValue(value);
            }
            else {
                transformRecordObject(value, transformedObject, keyPath);
            }
        }
    });
    return transformedObject;
};

const overrideTestValues = [{
    keyPath: 'BIDS',
    itemType: 'Greatsword',
    material: 'Elven',
    value: blacksmithHelpers.withRecord('Skyrim.esm:0183FF', xelib.LongName)
}];

let getOverrideTestValue = function(inKeyPath, inItemType, inMaterial) {
    const overrideTestValue = overrideTestValues.find(({keyPath, itemType, material}) => keyPath === inKeyPath && itemType == inItemType && material === inMaterial);
    if (overrideTestValue) {
        return overrideTestValue.value;
    }
};

let setupMockModule = function() {
    angular.mock.module('blacksmithTest');
    angular.mock.module('blacksmithTest', function($provide) {
        let mockSettingsService = {
            registerSettings: () => {},
            settings: {blacksmith: {debugMode: true}}
        };
    
        $provide.value('settingsService', mockSettingsService);
    });
};

beforeAll(function() {
    console.log('beforeAll - include files');

    require('./workflowSystem/workflowService');
    require('./workflowSystem/views/pluginSelector');
    const paths = fh.jetpack.find('src', {matching: ['*.js', '!*blacksmithHelpers.js', '!*blacksmithDebug.js']});
    paths.forEach(path => {
        require(`..\\${path}`)(zeditGlobals, blacksmithHelpers);
    });
});

afterAll(function() {
    console.log('afterAll - teardown xelib');
    xelib.Finalize();
});

let testCasesData = fh.jetpack.read('test/testCases.json', 'json');
let testCases = testCasesData; //.slice(0, 3);
testCases.forEach(({itemType, material, gearCategory, reference, recipeReference, temperReference}) => {
    if (gearCategory !== 'weapon' || !reference || reference === 'ERROR') {
        return;
    }

    describe(`makeGear ${gearCategory} ${material} ${itemType}`, function() {
        const gameRecordObject = xelib.WithHandle(
            blacksmithHelpers.getRecordFromReference(reference),
            id => xelib.WithHandle(
                xelib.GetWinningOverride(id),
                overrideId => blacksmithHelpers.elementToObject(overrideId)
            )
        );
        let gameTestObject = transformRecordObject(gameRecordObject);

        let stageRoadmap;
        let workflowObject;

        angular.mock.module.sharedInjector();

        beforeAll(function() {
            setupMockModule();

            let createGearRecordService;
            let workflowModel;
            inject(function(_createGearRecordService_, workflowService) {
                createGearRecordService = _createGearRecordService_;
                
                ({stageRoadmap, workflowModel} = workflowService.processWorkflow('makeWeapons', {
                    gearCategory
                }, {
                    'Select Weapons': {items: [{
                        name: 'Mock Weapon',
                        editorId: 'MockWeapon',
                        nif: 'MockModel.nif',
                        type: itemType,
                        material: material
                    }]},
                    'Set Weapon Attributes': {},
                    'Select Plugin': {
                        plugin: 'MockPlugin.esp'
                    }
                }));
            });

            const workflowRecordObject = createGearRecordService.createGearRecord(workflowModel.gearCategory, workflowModel.items[0]);
            workflowObject = transformRecordObject(workflowRecordObject);
        });

        test('Workflow completed successfully', function() {
            expect(stageRoadmap.every(stage => stage.isComplete())).toBeTruthy();
        });

        Object.keys(gameTestObject).forEach(key => {
            test(key, function() {
                const workflowValue = workflowObject[key];
                const gameValue = getOverrideTestValue(key, itemType, material) || gameTestObject[key];
                expect(workflowValue).toEqual(gameValue);
            });
        });
    });

    if (recipeReference === 'ERROR' || temperReference === 'ERROR') {
        return;
    }

    let doRecipeTests = function(isTemper) {
        const workflowName = isTemper ? 'makeTemperRecipes' : 'makeRecipes';
        describe(`${workflowName} ${gearCategory} ${material} ${itemType}`, function() {
            const gameRecipeRecordObject = xelib.WithHandle(
                blacksmithHelpers.getRecordFromReference(isTemper ? temperReference : recipeReference),
                id => xelib.WithHandle(
                    xelib.GetWinningOverride(id),
                    overrideId => blacksmithHelpers.elementToObject(overrideId)
                )
            );
            let gameRecipeTestObject = transformRecordObject(gameRecipeRecordObject);
    
            let stageRoadmap;
            let workflowTestObject;
    
            angular.mock.module.sharedInjector();
    
            beforeAll(function() {
                setupMockModule();
    
                let createRecipeRecordService;
                let workflowModel;
                inject(function(_createRecipeRecordService_, workflowService) {
                    createRecipeRecordService = _createRecipeRecordService_;
    
                    ({stageRoadmap, workflowModel} = workflowService.processWorkflow(workflowName, {
                        makeTemperRecipes: isTemper,
                        items: [{
                            reference,
                            type: itemType,
                            material,
                            get name() {
                                return blacksmithHelpers.withRecord(this.reference, xelib.FullName) || '';
                            },
                            get editorId() {
                                return blacksmithHelpers.withRecord(this.reference, xelib.EditorID) || '';
                            }
                        }]
                    }, {
                        'Select Material': {
                            material
                        },
                        'Edit Recipes': {},
                        'Select Plugin': {
                            plugin: 'MockPlugin.esp'
                        }
                    }));
                });
    
                const workflowRecordObject = createRecipeRecordService.createRecipeRecord(
                    workflowModel.material,
                    workflowModel.items[0],
                    workflowModel.recipes[0].ingredients,
                    isTemper,
                    'MockRecipeEditorId'
                );
                workflowTestObject = transformRecordObject(workflowRecordObject);
            });
    
            test('Workflow completed successfully', function() {
                expect(stageRoadmap.every(stage => stage.isComplete())).toBeTruthy();
            });
    
            Object.keys(gameRecipeTestObject).forEach(key => {
                test(key, function() {
                    const workflowValue = workflowTestObject[key];
                    const gameValue = getOverrideTestValue(key, itemType, material) || gameRecipeTestObject[key];
                    expect(workflowValue).toEqual(gameValue);
                });
            });
        });
    };
    doRecipeTests(false);
    doRecipeTests(true);
});
