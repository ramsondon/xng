var gulp = require('gulp');
var sass = require('gulp-sass');
var browserSync = require('browser-sync').create();
var header = require('gulp-header');
var cleanCSS = require('gulp-clean-css');
var rename = require("gulp-rename");
var uglify = require('gulp-uglify');
var umd = require('gulp-umd');
var pkg = require('./package.json');
var clean = require('gulp-clean');


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
    gulp.src('docs/src/scss/creative.scss')
        .pipe(sass())
        .pipe(header(banner, { pkg: pkg }))
        .pipe(gulp.dest('docs/src/css'))
        .pipe(browserSync.reload({
            stream: true
        }))
});

// Minify compiled CSS
gulp.task('minify-css', ['sass'], function() {
    gulp.src('docs/src/css/creative.css')
        .pipe(cleanCSS({ compatibility: 'ie8' }))
        .pipe(rename({ suffix: '.min' }))
        .pipe(gulp.dest('docs/web/css'))
        .pipe(browserSync.reload({
            stream: true
        }));
});

// Minify custom JS
gulp.task('minify-js', ['umd'],function() {
	gulp.src(['docs/src/js/**/*.js'])
    	.pipe(uglify())
        .pipe(header(banner, { pkg: pkg }))
        .pipe(rename({ suffix: '.min' }))
        .pipe(gulp.dest('docs/web/js'))
        .pipe(browserSync.reload({
            stream: true
        }));

	gulp.src(['dist/xng.js'])
    	.pipe(uglify())
        .pipe(header(banner, { pkg: pkg }))
        .pipe(rename({ suffix: '.min' }))
        .pipe(gulp.dest('dist'))
        .pipe(browserSync.reload({
            stream: true
        }));
});

// gulp.task('copy', function() {
// 	return gulp.src('docs/web/js/xng.min.js')
// 		.pipe(gulp.dest('dist'));
// });

gulp.task('umd', function(file) {
	var umdDefinition = {
		dependencies: function(file	) {
			return [
				{
					name: 'xng',
					amd: 'lodash',
					cjs: 'lodash',
					global: '_',
					param: '_'
				}
			];
		},
		exports: function (file) {
			return 'Xng';
		}
	};

	return gulp.src('src/xng.js')
		.pipe(umd(umdDefinition))
		.pipe(gulp.dest('dist'));

});

// gulp.task('clean', function () {
// 	return gulp.src('docs/web/js/xng.min.js', {read: false})
// 		.pipe(clean({force: true}));
// });

// Default task
gulp.task('default', ['sass', 'minify-css', 'umd', 'minify-js']);

// Configure the browserSync task
gulp.task('browserSync', function() {
    browserSync.init({
        server: {
            baseDir: ''
        }
    })
});

// Dev task with browserSync
gulp.task('dev', ['browserSync', 'sass', 'minify-css', 'umd', 'minify-js'], function() {
    gulp.watch('docs/src/scss/*.scss', ['sass']);
    gulp.watch('docs/src/css/*.css', ['minify-css']);
    gulp.watch('docs/src/js/*.js', ['minify-js']);
    gulp.watch('src/xng.js', ['umd', 'minify-js']);
    // Reloads the browser whenever HTML or JS files change
    gulp.watch('*.html', browserSync.reload);
    gulp.watch('docs/js/**/*.js', browserSync.reload);
});
