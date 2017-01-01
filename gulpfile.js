const gulp = require('gulp');
const babel = require('gulp-babel');
const browserify = require('browserify');
const transform = require('vinyl-source-stream');
const nodemon = require('gulp-nodemon');
const rename = require('gulp-rename');


gulp.task('browserify', () => {

	return browserify('index.js', {
			standalone: 'XibleWrapper'
		})
		.bundle()
		.pipe(transform('index.js'))
		.pipe(gulp.dest('./dist'));

});


gulp.task('toGlow', ['browserify'], () => {

	return gulp.src('dist/index.js')
		.pipe(rename('XibleWrapper.js'))
		.pipe(gulp.dest('../glow/static/shared/js/'));

});


gulp.task('start', () => {
	gulp.watch(['*.js'], ['toGlow']);
});
