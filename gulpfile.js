/* -------------------------------------------------------------------------- */
/*                           gulpfile configuration                           */
/* -------------------------------------------------------------------------- */
var gulp        = require('gulp'),
    concat      = require('gulp-concat'),
    minifyCSS   = require('gulp-minify-css'),
    uglify      = require('gulp-uglify'),
    connect     = require('gulp-connect'),
    watch       = require('gulp-watch'),
    rename      = require('gulp-rename'),
    sourcemaps  = require('gulp-sourcemaps'),
    htmlreplace = require('gulp-html-replace'),
    minifyHTML  = require('gulp-minify-html'),
    batch       = require('gulp-batch'),
    del         = require('del'),
    runSequence  = require('run-sequence');

/* paths of the bower components, using glob representaion */ 
var bowerDir = './bower_components',
    bowerPath = {
      JQUERY_JS:       bowerDir + '/jquery/dist/jquery.min.js',
      BOOTSTRAP_JS:    bowerDir + '/bootstrap/dist/js/bootstrap.min.js',
      BOOTSTRAP_CSS:  [bowerDir + '/bootstrap/dist/css/bootstrap.min.css',
                       bowerDir + '/bootstrap/dist/css/bootstrap-theme.min.css'],
      BOOTSTRAP_SASS: [bowerDir + '/bootstrap-sass/assets/stylesheets/*.scss',
                       bowerDir + '/bootstrap-sass/assets/stylesheets/bootstrap/*.scss']
};

/* path of source files and output directory */
var path = {
  HTML:        './app/*.html',
  JS:          ['./app/js/**/*.js', './app/js/*.js'].concat(
                bowerPath.JQUERY_JS,
                bowerPath.BOOTSTRAP_JS
               ),
  CSS:         ['./app/css/**/*.css', './app/css/*.css'].concat(
                bowerPath.BOOTSTRAP_CSS
               ),
  SASS:        ['./app/sass/**/*.js', './app/sass/*.scss'].concat(
                bowerPath.BOOTSTRAP_SASS
               ),
  OUT_JS:      'build.js',
  OUT_CSS:     'build.css',
  OUT_MIN_JS:  'build.min.js',
  OUT_MIN_CSS: 'build.min.css',
  DEST:        'dist'
};

path.ALL_SRC  = [path.HTML].concat(path.JS, path.CSS, path.SASS);
path.ALL_DIST = [path.DEST + '/**'].concat(path.DEST + '/css/**', path.DEST + '/js/**');


/* -------------------------------------------------------------------------- */
/*                           develop configuration                            */
/* -------------------------------------------------------------------------- */

/* concat all of css files and generate its sourcemap */
gulp.task('concat-css', function() {
  return gulp.src(path.CSS)
          .pipe(sourcemaps.init())
            .pipe(concat(path.OUT_CSS))
          .pipe(sourcemaps.write('.'))
          .pipe(gulp.dest(path.DEST + '/css/'));
});

/* concat all of js files and generate its sourcemap */
gulp.task('concat-js', function() {
  return gulp.src(path.JS)
          .pipe(sourcemaps.init())
            .pipe(concat(path.OUT_JS))
          .pipe(sourcemaps.write('.'))
          .pipe(gulp.dest(path.DEST + '/js/'));
});

/* replace resource paths with paths of the concated files */
gulp.task('replace-html', function() {
  return gulp.src(path.HTML)
          .pipe(htmlreplace({
            'css': 'css/' + path.OUT_CSS,
            'js': 'js/' + path.OUT_JS
          }))
          .pipe(gulp.dest(path.DEST));
});

/* watch the source codes */
gulp.task('watch', function() {
    // for js sources
  watch(path.JS, batch(function(events, done) {
    gulp.start('concat-js', done);
  }));
    // for css sources
  watch(path.CSS, batch(function(events, done) {
    gulp.start('concat-css', done);
  }));
    // for html sources
  watch(path.HTML, batch(function(events, done) {
    gulp.start('replace-html', done);
  }));
});

/* activate a simple gulp http server */
gulp.task('webserver', function() {
  connect.server({
    root: 'dist',
    livereload: true
  });
});

/* reload the gulp server while the files in outputed dir was changed */
gulp.task('livereload', function() {
  gulp.src(path.ALL_DIST)
    .pipe(watch(path.ALL_DIST))
    .pipe(connect.reload());
});

gulp.task('setup', ['concat-js', 'concat-css', 'replace-html']);

gulp.task('develop', function() {
  runSequence('setup', 'webserver', 'watch', 'livereload');
});

gulp.task('default', ['develop']);


/* -------------------------------------------------------------------------- */
/*                           develop configuration                            */
/* -------------------------------------------------------------------------- */

/* clean all of the outputed files and directory */
gulp.task('clean', function(cb) {
  return del([path.DEST], cb);
});

/* uglify the concated js files */
gulp.task('uglify-js', ['concat-js'], function() {
  return gulp.src(path.DEST + '/js/' + path.OUT_JS)
          .pipe(uglify())
          .pipe(rename(function(path) {
            path.basename += '.min';
          }))
          .pipe(gulp.dest(path.DEST + '/js/'));
});

/* minify the concated css files */
gulp.task('minify-css', ['concat-css'], function() {
  return gulp.src(path.DEST + '/css/' + path.OUT_CSS)
          .pipe(minifyCSS({compatibility: 'ie8'}))
          .pipe(rename(function(path) {
            path.basename += '.min';
          }))
          .pipe(gulp.dest(path.DEST + '/css/'));
});

/* minify the html files and replace its resource paths */
gulp.task('replace-minify-html', function() {
  return gulp.src(path.HTML)
          .pipe(htmlreplace({
            'css': 'css/' + path.OUT_MIN_CSS,
            'js': 'js/' + path.OUT_MIN_JS
          }))
          .pipe(minifyHTML())
          .pipe(gulp.dest(path.DEST));
});

/* delete all the temp files */
gulp.task('build', ['uglify-js', 'minify-css', 'replace-minify-html'], function(cb) {
  return del([path.DEST + '/css/**',
              '!' + path.DEST + '/css',
              '!' + path.DEST + '/css/' + path.OUT_MIN_CSS,
              path.DEST + '/js/**',
              '!' + path.DEST + '/js',
              '!' + path.DEST + '/js/' + path.OUT_MIN_JS], cb);
});

gulp.task('release', function() {
  runSequence('clean', 'build');
});
