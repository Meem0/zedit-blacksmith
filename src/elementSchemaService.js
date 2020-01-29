ngapp.service('elementSchemaService', function() {
    let getAtPath = function(object, keys) {
        return keys.reduce((subObj, key, idx) => {
            if (Array.isArray(subObj) || typeof(subObj) !== 'object') {
                return undefined;
            }
            return subObj[key];
        }, object);
    };
    
    let setAtPath = function(object, keys, value) {
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

    let processRecursive = function(sourceObj, targetObj, schema, keyStack) {
        const keys = Object.keys(schema);
        if (keys) {
            for (const key of keys) {
                if (key === 'forceValue') {
                    setAtPath(targetObj, keyStack, schema[key]);
                }
                else {
                    processRecursive(sourceObj, targetObj, schema[key], keyStack.concat(key));
                }
            }
        }
        else {
            // default action: copy from source to target
            setAtPath(targetObj, keyStack, getAtPath(sourceObj, keyStack));
        }
    };

    let defaultOpts = {
        inPlace: false
    };
    this.process = function(element, schema, opts = {}) {
        opts = Object.assign({}, defaultOpts, opts);

        if (typeof(element) !== 'object' || Array.isArray(element)) {
            return;
        }

        if (typeof(schema) === 'string') {
            schema = fh.loadJsonFile(`${modulePath}\\resources\\${schema}.json`, {});
        }

        let targetObj = opts.inPlace ? element : {};
        processRecursive(element, targetObj, schema, []);
        return targetObj;
    };
});
