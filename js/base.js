/*global __webpack_public_path__: true */
'use strict';
var config = require('./config');
__webpack_public_path__ = config.baseurl; //eslint-disable-line camelcase

require('./footer');
require('babel-polyfill');
