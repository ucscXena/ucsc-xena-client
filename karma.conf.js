var cidir = process.env.CIRCLE_TEST_REPORTS;
var dir = cidir ? cidir : '.';

module.exports = function(config) {
	config.set({
		frameworks: ['mocha'],
	files: ['build/testBundle.js'],
	reporters: ['junit'],
	junitReporter: {
		outputDir: dir,
		outputFile: 'test-results.xml',
		useBrowserName: false
	},
	port: 9876,  // karma web server port
	colors: true,
	logLevel: config.LOG_INFO,
	browsers: ['ChromeHeadless'],
	autoWatch: false,
	// singleRun: false, // Karma captures browsers, runs the tests and exits
	concurrency: Infinity
	});
};
