/*eslint-env browser */
/*global require: false, module: false */
'use strict';
var _ = require('./underscore_ext');

// properities of Error objects which we want to serialize.
var errorProps = ['name', 'message', 'context'];

var getErrorProps = (err) => {
	var props = _.pick(err, errorProps);
	return err.errors ? _.assoc(props, 'errors', err.errors.map(getErrorProps)) : props;
}

function CompositeError(message, ...errors) {
	Error.call(this, message);
	this.name = 'CompositeError';
	this.errors = errors;
}
CompositeError.prototype = Object.create(Error.prototype);
CompositeError.prototype.constructor = CompositeError;

function compositeError(message, ...errors) {
	var err = new Error(message);
	err.errors = errors;
	return err;
}

function logError(err) {
	if (err.errors) {
		err.errors.forEach(logError);
	}
	if (typeof window === 'object' && typeof window.chrome !== 'undefined') {
		// In Chrome, rethrowing provides better source map support
		setTimeout(() => { throw err; });
	} else {
		console.error(err.stack || err); // uglify should drop this for us in production
	}
	return err;
}


module.exports = {
	CompositeError,
	compositeError,
	getErrorProps,
	logError
}
