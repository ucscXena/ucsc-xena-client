/*jslint browser: true */
/*global define: false */
define(['lib/tracekit', 'config', 'tracekit_config', 'lib/polyfills'], function (TraceKit, config) {
	'use strict';
	function getCookie(name) {
		var cookieValue = null,
			cookies = document.cookie.split(';'),
			cookie,
			i;
		if (document.cookie && document.cookie !== '') {
			for (i = 0; i < cookies.length; i += 1) {
				cookie = cookies[i].trim();
				// Does this cookie string begin with the name we want?
				if (cookie.substring(0, name.length + 1) === (name + '=')) {
					cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
					break;
				}
			}
		}
		return cookieValue;
	}

	if (config.jslogging) {
		TraceKit.report.subscribe((function () {
			var memo = {}; // limit it to one report per error per session.
			return function (stackInfo) {
				var params = "data=" + encodeURIComponent(JSON.stringify(stackInfo)),
					req;

				if (!memo[params]) {
					memo[params] = true;

					req = new XMLHttpRequest();
					req.open("post", "../jslogger", true);
					req.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
					req.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
					req.send(params);
				}
			};
		}()));
	}
});
