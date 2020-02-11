ngapp.service('skyrimReferenceService', function() {
    let referenceAliases = fh.loadJsonFile(`${modulePath}/resources/referenceAliases.json`);

    this.getReferenceFromName = function(inName) {
        if (!inName) {
            return '';
        }
        const alias = referenceAliases.find(({name}) => name === inName);
        return alias ? alias.reference : '';
    };
});
