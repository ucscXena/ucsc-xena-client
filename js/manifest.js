'use strict';

import {isString, isArray, isObject} from './underscore_ext';


var schemaCheck = data =>
	isObject(data) &&
	isString(data.cohort) &&
	isArray(data.samples) &&
	data.samples.every(isString) &&
	data || undefined;

export default function parse(manifest) {
	var m = schemaCheck(JSON.parse(manifest));
	if (!m) {
		throw new Error('Unable to read manifest', manifest);
	}
	// XXX need to handle manifest-error action & report to user.
	return m;
}
