var gulp = require('gulp');
var sass = require('gulp-sass');
var browserSync = require('browser-sync').create();
var header = require('gulp-header');
var cleanCSS = require('gulp-clean-css');
var rename = require("gulp-rename");
var uglify = require('gulp-uglify');
var pkg = require('./package.json');

// Set the banner content
var banner = ['/*!\n',
	' * ramsondon.github.io - <%= pkg.title %> v<%= pkg.version %> (<%= pkg.homepage %>)\n',
	' * Copyright 2017 -' + (new Date()).getFullYear(), ' <%= pkg.author %>\n',
	' * Licensed under <%= pkg.license %> (https://github.com/ramsondon/<%= pkg.name %>/blob/master/LICENSE)\n',
	' */\n',
	''
].join('');


// Compiles SCSS files from /scss into /css
gulp.task('sass', function() {
    return gulp.src('docs/src/scss/creative.scss')
        .pipe(sass())
        .pipe(header(banner, { pkg: pkg }))
        .pipe(gulp.dest('docs/src/css'))
        .pipe(browserSync.reload({
            stream: true
        }))
});

// Minify compiled CSS
gulp.task('minify-css', ['sass'], function() {
    return gulp.src('docs/src/css/creative.css')
        .pipe(cleanCSS({ compatibility: 'ie8' }))
        .pipe(rename({ suffix: '.min' }))
        .pipe(gulp.dest('docs/web/css'))
        .pipe(browserSync.reload({
            stream: true
        }))
});

// Minify custom JS
gulp.task('minify-js', function() {
    return gulp.src(['docs/src/js/**/*.js', 'src/xng.js'])
    	.pipe(uglify())
        .pipe(header(banner, { pkg: pkg }))
        .pipe(rename({ suffix: '.min' }))
        .pipe(gulp.dest('docs/web/js'))
        .pipe(browserSync.reload({
            stream: true
        }))
});

// Copy vendor files from /node_modules into /vendor
// NOTE: requires `npm install` before running!
// gulp.task('copy', function() {
//     gulp.src(['node_modules/bootstrap/dist/**/*', '!**/npm.js', '!**/bootstrap-theme.*', '!**/*.map'])
//         .pipe(gulp.dest('vendor/bootstrap'));
//
//     gulp.src(['node_modules/jquery/dist/jquery.js', 'node_modules/jquery/dist/jquery.min.js'])
//         .pipe(gulp.dest('vendor/jquery'));
//
//     gulp.src(['node_modules/magnific-popup/dist/*'])
//         .pipe(gulp.dest('vendor/magnific-popup'));
//
//     gulp.src(['node_modules/scrollreveal/dist/*.js'])
//         .pipe(gulp.dest('vendor/scrollreveal'));
//
//     gulp.src(['node_modules/tether/dist/js/*.js'])
//         .pipe(gulp.dest('vendor/tether'));
//
//     gulp.src(['node_modules/jquery.easing/*.js'])
//         .pipe(gulp.dest('vendor/jquery-easing'));
//
//     gulp.src(['node_modules/lodash/lodash.js'])
//         .pipe(gulp.dest('vendor/lodash'));
//
//     gulp.src([
//             'node_modules/font-awesome/**',
//             '!node_modules/font-awesome/**/*.map',
//             '!node_modules/font-awesome/.npmignore',
//             '!node_modules/font-awesome/*.txt',
//             '!node_modules/font-awesome/*.md',
//             '!node_modules/font-awesome/*.json'
//         ])
//         .pipe(gulp.dest('vendor/font-awesome'))
// });

// Default task
gulp.task('default', ['sass', 'minify-css', 'minify-js', 'copy']);

// Configure the browserSync task
gulp.task('browserSync', function() {
    browserSync.init({
        server: {
            baseDir: ''
        },
    })
})

// Dev task with browserSync
gulp.task('dev', ['browserSync', 'sass', 'minify-css', 'minify-js'], function() {
    gulp.watch('docs/src/scss/*.scss', ['sass']);
    gulp.watch('docs/src/css/*.css', ['minify-css']);
    gulp.watch('docs/src/js/*.js', ['minify-js']);
    gulp.watch('src/xng.js', ['minify-js']);
    // Reloads the browser whenever HTML or JS files change
    gulp.watch('*.html', browserSync.reload);
    gulp.watch('docs/js/**/*.js', browserSync.reload);
});
