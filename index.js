let zeditGlobals = {ngapp, xelib, fh, logger, modulePath, moduleUrl};
let blacksmithHelpers = require(`${modulePath}/src/helpers/blacksmithHelpers`)(zeditGlobals);

const srcPath = fh.path(modulePath, 'src');
fh.getFiles(srcPath, {
    matching: '**/*.js'
}).forEach(filePath => {
    let filename = fh.getFileName(filePath);
    if (filename === 'blacksmithHelpers.js') {
        return;
    }
    require(filePath)(zeditGlobals, blacksmithHelpers);
});
