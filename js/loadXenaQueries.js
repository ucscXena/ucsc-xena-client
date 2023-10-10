// Load all xena queries

var glob = require("glob");
var files = glob.sync('./queries/*.xq', {cwd: __dirname});

var toName = path => path.replace(/.*\//, '').replace(/\.xq$/, '');
var toImport = path => `import ${toName(path)} from "${path}";\n`;

module.exports = (/*options, loaderContext*/) => ({
	code: `
		${files.map(toImport).join('')}
		export {
				${files.map(toName).join(',\n')}
		};
		`
});
