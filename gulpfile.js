const fs = require('fs');
const jetpack = require('fs-jetpack');
const readline = require('readline');
const del = require('del');
const gulp = require('gulp');
const rename = require('gulp-rename');
const sass = require('gulp-sass');
const zip = require('gulp-zip');
const merge = require('merge-stream');

function clean() {
    return del('dist');
}

function build() {
	let index = gulp.src('index.js')
        .pipe(gulp.dest('dist'));

    let src = gulp.src('src/**/*.js')
        .pipe(gulp.dest('dist/src'));

    let lib = gulp.src('lib/**/*')
        .pipe(gulp.dest('dist/lib'));

    let partials = gulp.src('partials/**/*.html')
        .pipe(gulp.dest('dist/partials'));

    let resources = gulp.src('resources/**/*')
        .pipe(gulp.dest('dist/resources'));

    let css = gulp.src('stylesheets/themes/*.scss')
        .pipe(sass().on('error', console.log))
        .pipe(gulp.dest('dist/css'));

    let docs = gulp.src('docs/*.html')
        .pipe(gulp.dest('dist/docs'));

    let moduleJson = gulp.src('module.json')
        .pipe(gulp.dest('dist'));
    
    return merge(index, src, lib, partials, resources, css, docs, moduleJson);
}

function release() {
    let moduleInfo = JSON.parse(fs.readFileSync('module.json')),
        moduleId = moduleInfo.id,
        moduleVersion = moduleInfo.version,
        zipFileName = `${moduleId}-v${moduleVersion}.zip`;

    console.log(`Packaging ${zipFileName}`);

    return gulp.src('dist/**/*', { base: 'dist/'})
        .pipe(rename((path) => path.dirname = `${moduleId}/${path.dirname}`))
        .pipe(zip(zipFileName))
        .pipe(gulp.dest('.'));
}

function setup(cb) {
    let validatePath = function(path, cb) {
        if (!jetpack.exists(path)) {
            cb(new Error('Could not find path ' + path));
            return false;
        }
        return true;
    }

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    rl.question('Enter zedit dev folder (e.g. "C:/Projects/zedit", "../zedit"): ', function(zeditDir) {
        rl.close();

        let zeditModulesDir = jetpack.cwd(zeditDir, 'modules');
        let zeditGeneralDir = jetpack.cwd(zeditDir, 'src\\stylesheets\\general');
        let zeditThemesDir = jetpack.cwd(zeditDir, 'src\\stylesheets\\themes');
    
        if (validatePath(zeditModulesDir.cwd(), cb) && validatePath(zeditGeneralDir.cwd(), cb) && validatePath(zeditThemesDir.cwd(), cb)) {
            let zeditBlacksmithModuleDir = zeditModulesDir.cwd('blacksmith');
            let blacksmithDistDir = jetpack.cwd('dist');
            let blacksmithLibDir = jetpack.cwd('stylesheets\\lib');
            let blacksmithThemesDir = jetpack.cwd('stylesheets\\themes');

            jetpack.remove(zeditBlacksmithModuleDir.cwd());
            jetpack.remove(blacksmithLibDir.cwd());
            jetpack.remove(blacksmithThemesDir.cwd());
        
            fs.symlinkSync(blacksmithDistDir.cwd(), zeditBlacksmithModuleDir.cwd(), 'dir');
            console.log(`Created symlink ${zeditBlacksmithModuleDir.cwd()} -> ${blacksmithDistDir.cwd()}`);
            fs.symlinkSync(zeditGeneralDir.cwd(), blacksmithLibDir.cwd(), 'dir');
            console.log(`Created symlink ${blacksmithLibDir.cwd()} -> ${zeditGeneralDir.cwd()}`);
            fs.symlinkSync(zeditThemesDir.cwd(), blacksmithThemesDir.cwd(), 'dir');
            console.log(`Created symlink ${blacksmithThemesDir.cwd()} -> ${zeditThemesDir.cwd()}`);

            cb();
        }
    });
}

exports.release = release;
exports.build = gulp.series(clean, build);
exports.setup = setup;
