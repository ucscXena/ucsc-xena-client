/*eslint-env browser */
/*global require: false, module: false */
'use strict';

var _ = require('./underscore_ext');

function getNotifications() {
	var nj = localStorage.xenaNotifications || '{}',
		notes;
	try {
		notes = JSON.parse(nj);
	} catch(err) {
	}
	return _.isObject(notes) ? notes : {};
}

function setNotifications(notes) {
	localStorage.xenaNotifications = JSON.stringify(notes);
}

function disableNotification(notes, note) {
	return _.assoc(notes, note, true);
}

module.exports = {
	getNotifications,
	disableNotification,
	setNotifications
};
