
import * as _ from './underscore_ext.js';

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

export { getNotifications, disableNotification, setNotifications };
