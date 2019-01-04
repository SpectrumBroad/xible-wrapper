'use strict';

const gulp = require('gulp');
const browserify = require('browserify');
const transform = require('vinyl-source-stream');

gulp.task('browserify', () =>
  browserify('index.js', {
    standalone: 'XibleWrapper'
  })
  .bundle()
  .pipe(transform('index.js'))
  .pipe(gulp.dest('./dist'))
);

gulp.task('default', gulp.series('browserify'), () => {
  gulp.watch(['*.js'], gulp.series('browserify'));
});
