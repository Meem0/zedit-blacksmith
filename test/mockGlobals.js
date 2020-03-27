const angular = require('angular');
window.angular = angular;

require('angular-mocks');

ngapp = angular.module('blacksmithTest', []);

logger = {
    info: (str) => console.info(str),
    warn: (str) => console.warn(str),
    error: (str) => console.error(str)
};

fh = {
    jetpack: require('fs-jetpack'),
    loadJsonFile: function(filePath) {
        if (this.jetpack.exists(filePath) === 'file') {
            return this.jetpack.read(filePath, 'json');
        }
    }
};

xelib = require('xelib').wrapper;
xelib.Initialize('node_modules\\xelib\\XEditLib.dll');
xelib.SetGameMode(xelib.gmSSE);
xelib.LoadPlugins('Skyrim.esm\nUpdate.esm\nDawnguard.esm\nUnofficial Skyrim Special Edition Patch.esp');
console.log('Waiting for xelib...');
while (xelib.GetLoaderStatus() < 2) {
}
console.log('xelib done loading');

modulePath = fh.jetpack.cwd();
moduleUrl = `file:///${modulePath}`;

zeditGlobals = {xelib, logger};
