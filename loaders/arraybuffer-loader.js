const { getOptions, stringifyRequest } = require('loader-utils');
const validate = require('schema-utils');
const path = require('path');

const schema = {
  type: 'object',
  properties: {
    // Optional configuration if needed in the future
  },
};

module.exports = function (content) {
  const options = getOptions(this) || {};
  validate(schema, options, { name: 'ArrayBuffer Loader' });

  if (this.cacheable) {
    this.cacheable();
  }

  // Convert the binary content to base64
  const base64Data = content.toString('base64');

  // Generate a Webpack-compatible request for to-array-buffer.js
  const toArrayBufferPath = stringifyRequest(this, path.resolve(__dirname, 'to-array-buffer.js'));

  // Add the runtime helper as a dependency
  this.addDependency(path.resolve(__dirname, 'to-array-buffer.js'));

  // Generate the output module (CommonJS)
  return `
    const toArrayBuffer = require(${toArrayBufferPath}).default;
    module.exports = toArrayBuffer('${base64Data}');
  `;
};

module.exports.raw = true;
