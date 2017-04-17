const gulp = require('gulp');
const babel = require('gulp-babel');
const browserify = require('browserify');
const transform = require('vinyl-source-stream');
const rename = require('gulp-rename');

gulp.task('browserify', () => {

	return browserify('index.js', {
			standalone: 'XibleWrapper'
		})
		.bundle()
		.pipe(transform('index.js'))
		.pipe(gulp.dest('./dist'));

});

gulp.task('toXibleEditor', ['browserify'], () => {

	return gulp.src('dist/index.js')
		.pipe(rename('xibleWrapper.js'))
		.pipe(gulp.dest('../xible/editor/js/'));

});

gulp.task('start', () => {
	gulp.watch(['*.js'], ['browserify']);
});

gulp.task('xibleeditor', ['toXibleEditor'], () => {
	gulp.watch(['*.js'], ['toXibleEditor']);
});
