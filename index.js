let zeditGlobals = {ngapp, xelib, fh, logger, modulePath, moduleUrl};
let blacksmithHelpers = require(`${modulePath}/src/helpers/blacksmithHelpers`)(zeditGlobals);

const srcPath = fh.path(modulePath, 'src');
fh.getFiles(srcPath, {
    matching: ['**/*.js', '!*blacksmithHelpers.js']
}).forEach(filePath => {
    require(filePath)(zeditGlobals, blacksmithHelpers);
});
