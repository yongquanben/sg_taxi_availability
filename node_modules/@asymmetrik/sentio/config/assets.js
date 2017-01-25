'use strict';

module.exports = {
	// Build related items
	build: {
		js: [ 'gulpfile.js', 'config/assets.js' ]
	},

	// Test files
	tests: {
		js: [ 'test/js/**/*.js' ]
	},

	// Source files and directories
	src: {
		entry: 'src/js/index.js',
		js: 'src/js/**/*.js',
		sass: [
			'src/sass/**/*.scss'
		]
	},

	// Distribution related items
	dist: {
		dir: 'dist'
	}
};
