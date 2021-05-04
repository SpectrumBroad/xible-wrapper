'use strict';

const gulp = require('gulp');
const browserify = require('browserify');
const transform = require('vinyl-source-stream');

gulp.task('build', () => browserify('index.js', {
  standalone: 'XibleWrapper'
})
  .bundle()
  .pipe(transform('index.js'))
  .pipe(gulp.dest('./dist')));

gulp.task('default', gulp.series('build', () => gulp.watch('*.js', gulp.series('build'))));
