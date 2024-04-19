var _ = require('./underscore_ext').default;

// properities of Error objects which we want to serialize.
var errorProps = ['name', 'message', 'context', 'status'];
var getXhrLocation = err => _.get(err, 'xhr') ?
	{location: err.xhr.getResponseHeader('location')} : {};

var getXhrHost = err => _.getIn(err, ['request', 'url']) ?
	{origin: (new URL(err.request.url)).origin} : {};

var getErrorProps = (err) => {
	var props = _.merge(_.pick(err, errorProps), getXhrLocation(err),
		getXhrHost(err));
	return err.errors ? _.assoc(props, 'errors', err.errors.map(getErrorProps)) : props;
};

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
};
