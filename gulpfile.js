const fs = require('fs');
const del = require('del');
const gulp = require('gulp');
const include = require('gulp-include');
const rename = require('gulp-rename');
const sass = require('gulp-sass');
const zip = require('gulp-zip');
const merge = require('merge-stream');

function clean() {
    return del('dist');
}

function build() {
	let scripts = gulp.src('index.js')
        .pipe(include())
        .on('error', console.log)
        .pipe(gulp.dest('dist'));

	let lib = gulp.src('lib/**/*.js')
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
    
    return merge(scripts, lib, partials, resources, css, docs, moduleJson);
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

exports.release = release;
exports.build = gulp.series(clean, build);
