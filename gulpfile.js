/* -------------------------------------------------------------------------- */
/*                           gulpfile configuration                           */
/* -------------------------------------------------------------------------- */
var gulp         = require('gulp'),
    concat       = require('gulp-concat'),
    minifyCSS    = require('gulp-minify-css'),
    uglify       = require('gulp-uglify'),
    connect      = require('gulp-connect'),
    watch        = require('gulp-watch'),
    rename       = require('gulp-rename'),
    sourcemaps   = require('gulp-sourcemaps'),
    htmlreplace  = require('gulp-html-replace'),
    minifyHTML   = require('gulp-minify-html'),
    batch        = require('gulp-batch'),
    bootlint     = require('gulp-bootlint'),
    sass         = require('gulp-sass'),
    autoprefixer = require('gulp-autoprefixer'),
    del          = require('del'),
    runSequence  = require('run-sequence');

  // the name of the directory that stores our sources
var src_root = 'app';
  // use customized Bootstrap scss files?
var useBootstrapSASS = true;

/* paths of the bower components, using glob representaion */ 
var bowerDir = './bower_components',
    bowerPath = {
      JQUERY_JS:       bowerDir + '/jquery/dist/jquery.min.js',
      JQUERY_JS_v1:    bowerDir + '/jquery_v1/dist/jquery.min.js',
      BOOTSTRAP_JS:    bowerDir + '/bootstrap/dist/js/bootstrap.min.js',
      BOOTSTRAP_CSS:  [bowerDir + '/bootstrap/dist/css/bootstrap.min.css',
                       bowerDir + '/bootstrap/dist/css/bootstrap-theme.min.css'],
      BOOTSTRAP_SASS:  bowerDir + '/bootstrap-sass/assets/stylesheets',
      BOOTSTRAP_FONTS: bowerDir + '/bootstrap-sass/assets/fonts/**/*'
};

/* path of source files and output directory */
var path = {
  HTML:            './' + src_root + '/*.html',
  JS:              ['./' + src_root + '/js/**/*.js', './' + src_root + '/js/*.js'].concat(
                    bowerPath.JQUERY_JS,
                    bowerPath.BOOTSTRAP_JS
                   ),
  CSS:             ['./' + src_root + '/css/**/*.css', './' + src_root + '/css/*.css'].concat(
                    bowerPath.BOOTSTRAP_CSS
                   ),
  CSS_NO_BS:       ['./' + src_root + '/css/**/*.css', './' + src_root + '/css/*.css'],
  SASS_SRC:        ['./' + src_root + '/sass/**/*.scss', './' + src_root + '/sass/*.scss'].concat(
                    bowerPath.BOOTSTRAP_SASS + '/**/*.scss'
                   ), // path for the sources of scss files, includes bootstrap-sass
  SASS_NO_BS_SRC:  ['./' + src_root + '/sass/**/*.scss', './' + src_root + '/sass/*.scss'],
  SASS_PATH:       ['./' + src_root + '/sass', './' + src_root + '/sass/**/'].concat(
                    bowerPath.BOOTSTRAP_SASS,
                    bowerPath.BOOTSTRAP_SASS + '/bootstrap'
                   ), // path for include path of the sass, includes bootstrap-sass
  SASS_NO_BS_PATH: ['./' + src_root + '/sass', './' + src_root + '/sass/**/'],
  SASS_OUTPUT:     './' + src_root + '/css/sass_output',
  FONTS:           ['./' + src_root + '/fonts'].concat(
                    bowerPath.BOOTSTRAP_FONTS
                   ),
  DEST:            'dist',
  OUT_JS:          'build.js',
  OUT_CSS:         'build.css',
  OUT_MIN_JS:      'build.min.js',
  OUT_MIN_CSS:     'build.min.css'
};

path.ALL_SRC  = [path.HTML].concat(path.JS, path.CSS, path.SASS);
path.ALL_DIST = [path.DEST + '/**'].concat(path.DEST + '/css/**', path.DEST + '/js/**');


/* -------------------------------------------------------------------------- */
/*                           develop configuration                            */
/* -------------------------------------------------------------------------- */

/* copy the fonts to the dist folder */
gulp.task('fonts', function() {
  return gulp.src(path.FONTS)
          .pipe(gulp.dest(path.DEST + '/fonts/'));
});

/* compile sass files, prefixer them into dist folder */
gulp.task('sass', function() {
  return gulp.src(useBootstrapSASS ? path.SASS_SRC : path.SASS_NO_BS_PATH)
          .pipe(sourcemaps.init())
            .pipe(sass({
              precision: 10,
              includePaths: useBootstrapSASS ? path.SASS_PATH : path.SASS_NO_BS_PATH
            }).on('error', sass.logError))
            .pipe(autoprefixer('last 5 version', 'ie 8', 'ie 9'))
          .pipe(sourcemaps.write('./'))
          .pipe(gulp.dest(path.SASS_OUTPUT));
});

/* concat all of css files and generate its sourcemaps */
gulp.task('concat-css', function() {
  return gulp.src(useBootstrapSASS ? path.CSS_NO_BS : path.CSS)
          .pipe(sourcemaps.init({loadMaps: true}))
            .pipe(concat(path.OUT_CSS))
          .pipe(sourcemaps.write('./'))
          .pipe(gulp.dest(path.DEST + '/css/'));
});

/* concat all of js files and generate its sourcemaps */
gulp.task('concat-js', function() {
  return gulp.src(path.JS)
          .pipe(sourcemaps.init())
            .pipe(concat(path.OUT_JS))
          .pipe(sourcemaps.write('./'))
          .pipe(gulp.dest(path.DEST + '/js/'));
});

/* check whether the bootstrap grammar in the HTML is legal */
gulp.task('bootlint', function() {
  return gulp.src('./index.html')
          .pipe(bootlint({
            stoponerror: true,
            stoponwarning: true,
            loglevel: 'debug',
            reportFn: function(file, lint, isError, isWarning, errorLocation) {
              var message = (isError) ? "ERROR! - " : "WARN! - ";
              if (errorLocation) {
                  message += file.path + ' (line:' + (errorLocation.line + 1) + ', col:' + (errorLocation.column + 1) + ') [' + lint.id + '] ' + lint.message;
              } else {
                  message += file.path + ': ' + lint.id + ' ' + lint.message;
              }
              console.log(message);
            },
            summaryReportFn: function(file, errorCount, warningCount) {
              if (errorCount > 0 || warningCount > 0) {
                  console.log("please fix the " + errorCount + " errors and "+ warningCount + " warnings in " + file.path);
              } else {
                  console.log("No problems found in "+ file.path);
              }
          }}));
});

/* replace resource paths with paths of the concated files */
gulp.task('replace-html', ['bootlint'], function() {
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
  watch(useBootstrapSASS ? path.CSS_NO_BS : path.CSS, batch(function(events, done) {
    gulp.start('concat-css', done);
  }));
    // for sass sources
  watch(path.SASS_PATH, batch(function(events, done) {
    gulp.start('sass', done);
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

gulp.task('setup', ['concat-js', 'sass', 'replace-html', 'fonts']);

gulp.task('develop', function() {
  runSequence('setup', 'concat-css', 'webserver', 'watch', 'livereload');
});

gulp.task('default', ['develop']);


/* -------------------------------------------------------------------------- */
/*                           develop configuration                            */
/* -------------------------------------------------------------------------- */

/* clean all of the outputed files and directory */
gulp.task('clean', function(cb) {
  return del([path.DEST, path.SASS_OUTPUT], cb);
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
gulp.task('replace-minify-html', ['bootlint'], function() {
  return gulp.src(path.HTML)
          .pipe(htmlreplace({
            'css': 'css/' + path.OUT_MIN_CSS,
            'js': 'js/' + path.OUT_MIN_JS
          }))
          .pipe(minifyHTML())
          .pipe(gulp.dest(path.DEST));
});

/* delete all the temp files */
gulp.task('build', ['uglify-js', 'minify-css', 'replace-minify-html', 'fonts'], function(cb) {
  return del([path.DEST + '/css/**',
              '!' + path.DEST + '/css',
              '!' + path.DEST + '/css/' + path.OUT_MIN_CSS,
              path.DEST + '/js/**',
              '!' + path.DEST + '/js',
              '!' + path.DEST + '/js/' + path.OUT_MIN_JS], cb);
});

gulp.task('release', function() {
  runSequence('clean', 'sass', 'build');
});
