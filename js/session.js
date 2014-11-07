/*jslint browser:true */
/*global define: false */
define(["xenaQuery", "rx", "dom_helper", "underscore_ext"], function (xenaQuery, Rx, dom_helper, _) {
	'use strict';

	function xenaHeatmapStateReset() {
		var xenaStateResets = {
				samples: [],
				samplesFrom: "",
				height: 717,
				zoomIndex: 0,
				zoomCount: 0,
				column_rendering: {},
				column_order: [],
				cohort: ""
			},
			state = sessionStorage.xena ? JSON.parse(sessionStorage.xena) : {servers: {user: []}};
		sessionStorage.xena = JSON.stringify(_.extend(state, xenaStateResets));
	}

	//set xena user server
	function setXenaUserServer() {
		if (!sessionStorage.xena) {
			xenaHeatmapStateReset();
		}
		// genome-cancer :443 switch XXX why?
		var state = JSON.parse(sessionStorage.xena),
			oldHost = "https://genome-cancer.ucsc.edu/proj/public/xena",
			newHost = "https://genome-cancer.ucsc.edu:443/proj/public/xena";

		state.servers.user = _.map(_.intersection(JSON.parse(sessionStorage.state).activeHosts,
			JSON.parse(sessionStorage.state).userHosts), function (host) {
				return host === oldHost ? newHost : host;
			});

		sessionStorage.xena = JSON.stringify(state);
	}


	function sessionStorageInitialize() {
		var defaultHosts = [
				"https://genome-cancer.ucsc.edu/proj/public/xena",
				"http://localhost:7222"
			],
			defaultState = {
				activeHosts: ["https://genome-cancer.ucsc.edu/proj/public/xena"],
				allHosts: defaultHosts,
				userHosts: ["https://genome-cancer.ucsc.edu/proj/public/xena"]
			},
			state = sessionStorage.state ? JSON.parse(sessionStorage.state) : {};
		sessionStorage.state = JSON.stringify(_.extend(defaultState, state));
		setXenaUserServer();
	}

	function removeHostFromListInSession(list, host) {
		var state = JSON.parse(sessionStorage.state);
		state[list] = _.difference(state[list], [host]);
		sessionStorage.state = JSON.stringify(state);
		setXenaUserServer();
	}

	function addHostToListInSession(list, host) {
		var state = JSON.parse(sessionStorage.state);
		state[list] = _.union(state[list], [host]);
		sessionStorage.state = JSON.stringify(state);
		setXenaUserServer();
	}

	function hostCheckBox(host, ifChangedAction) {
		var userHosts = JSON.parse(sessionStorage.state).userHosts,
			checkbox = document.createElement("INPUT");
		checkbox.setAttribute("type", "checkbox");
		checkbox.setAttribute("id", "checkbox" + host);

		checkbox.checked = _.contains(userHosts, host);

		checkbox.addEventListener('click', function () {
			var checked = checkbox.checked,
				stateJSON = JSON.parse(sessionStorage.state),
				newList;
			if (checked !== _.contains(stateJSON.userHosts, host)) {
				if (checked) { // add host
					addHostToListInSession('userHosts', host);
				} else { // remove host
					removeHostFromListInSession('userHosts', host);

					//check if host that will be removed has the "cohort" in the xena heatmap state setting ///////////TODO
					xenaQuery.all_cohorts(host).subscribe(function (s) {
						var xenaState = JSON.parse(sessionStorage.xena);
						if (xenaState.cohort && _.contains(s, xenaState.cohort)) { // reset xenaHeatmap
							xenaHeatmapStateReset();
						}
					});
				}
				setXenaUserServer();

				if (ifChangedAction) {
					ifChangedAction.apply(null, arguments);
				}
			}
		});

		return checkbox;
	}

	function updateHostDOM(host, status) {
		var display = {
				'live': {msg: '', el: 'result1'},
				'dead': {msg: ' (not running)', el: 'result2'},
				'nodata': {msg: ' (no data)', el: 'result2'},
				'slow': {msg: ' (there is a problem)', el: 'result2'},
			},
			node = document.getElementById("status" + host);

		if (node) {
			node.parentNode.replaceChild(
				dom_helper.elt(display[status].el, dom_helper.hrefLink(host + display[status].msg, "../datapages/?host=" + host)), node);
		}
	}

	function updateHostStatus(host) {
		addHostToListInSession('allHosts', host);

		xenaQuery.test_host(host).subscribe(function (s) {
			if (s) {
				// test if host can return useful data
				var start = Date.now();
				xenaQuery.all_cohorts(host).subscribe(function (s) {
					var duration;
					if (s.length > 0) {
						addHostToListInSession('activeHosts', host);
						updateHostDOM(host, 'live');
					} else {
						duration = Date.now() - start;
						removeHostFromListInSession('activeHosts', host);
						updateHostDOM(host, (duration > 3000) ? 'slow' : 'nodata');
					}
				});
			} else {
				removeHostFromListInSession('activeHosts', host);
				updateHostDOM(host, 'dead');
			}
		});
	}

	return {
		sessionStorageInitialize: sessionStorageInitialize,
		updateHostStatus: updateHostStatus,
		hostCheckBox: hostCheckBox
	};
});
