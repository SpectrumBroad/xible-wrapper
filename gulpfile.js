'use strict';

const gulp = require('gulp');
const browserify = require('browserify');
const transform = require('vinyl-source-stream');
const rename = require('gulp-rename');

gulp.task('browserify', () =>
  browserify('index.js', {
    standalone: 'XibleWrapper'
  })
  .bundle()
  .pipe(transform('index.js'))
  .pipe(gulp.dest('./dist')));

gulp.task('toXibleEditor', ['browserify'], () =>
  gulp.src('dist/index.js')
  .pipe(rename('xibleWrapper.js'))
  .pipe(gulp.dest('../xible/editor/js/')));

gulp.task('start', () => {
  gulp.watch(['*.js'], ['browserify']);
});

gulp.task('xibleeditor', ['toXibleEditor'], () => {
  gulp.watch(['*.js'], ['toXibleEditor']);
});
