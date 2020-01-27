ngapp.service('elementSchemaService', function() {
    let assignAtPath = function(object, keys, value) {
        keys.reduce((subObj, key, idx) => {
            if (idx === keys.length - 1) {
                subObj[key] = value;
                return object;
            }
            if (subObj[key] === undefined) {
                subObj[key] = {};
            }
            return subObj[key];
        }, object);
    };

    let processRecursive = function(elementRoot, schema, keyStack) {
        for (const key of Object.keys(schema)) {
            if (key === 'forceValue') {
                assignAtPath(elementRoot, keyStack, schema[key]);
            }
            else {
                processRecursive(elementRoot, schema[key], keyStack.concat(key));
            }
        }
    };

    this.process = function(element, schema) {
        if (typeof(element) !== 'object' || Array.isArray(element)) {
            return;
        }

        if (typeof(schema) === 'string') {
            schema = fh.loadJsonFile(`${modulePath}\\resources\\${schema}.json`, {});
        }

        processRecursive(element, schema, []);
    };
});