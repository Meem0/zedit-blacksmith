ngapp.service('jsonService', function() {
    this.loadJsonFile = function(filename) {
        return fh.loadJsonFile(`${modulePath}/resources/${filename}.json`);
    };

    this.loadJsonFilesInFolder = function(folderName) {
        return fh.jetpack.find(`${modulePath}/resources/${folderName}`, {matching: ['*.json']}).map(path => fh.loadJsonFile(path));
    };
});
