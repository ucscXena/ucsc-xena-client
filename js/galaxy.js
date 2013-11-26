/*jslint browser: true */
/*global define: false */
define([ "jquery" ], function ($) {
	'use strict';

	var url, tool_id;

	function send(file) {
		var parameters = "?URL=" + encodeURIComponent(window.location.origin + file) + "&tool_id=" + encodeURIComponent(tool_id);
		window.location = url + parameters;
	}

	// see http://stackoverflow.com/questions/901115/how-can-i-get-query-string-values/901144#901144
	function getParameterByName(name) {
		var match = new RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
		return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
	}

	url = getParameterByName("GALAXY_URL");
	tool_id = getParameterByName("tool_id");

	return {
		fromGalaxy: function () {
			return !!url; // coerce to boolean
		},
		download: send
	};
});
