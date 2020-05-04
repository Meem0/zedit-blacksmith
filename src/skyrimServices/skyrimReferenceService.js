module.exports = ({ngapp}) =>
ngapp.service('skyrimReferenceService', function(jsonService) {
    let referenceAliases = jsonService.loadJsonFile('referenceAliases');

    this.getReferenceFromName = function(inName) {
        if (!inName) {
            return '';
        }
        const alias = referenceAliases.find(({name}) => name === inName);
        return alias ? alias.reference : '';
    };
});
