/*jslint browser:true */
/*global define: false */
define(["xenaQuery", "rx", "dom_helper", "underscore_ext"], function (xenaQuery, Rx, dom_helper, _) {
	'use strict';

	var resetXenaState = {
			samples: [],
			samplesFrom: "",
			height: 717,
			zoomIndex: 0,
			zoomCount: 0,
			column_rendering: {},
			column_order: [],
			cohort: ""
		}, defaultHosts = [
			"https://genome-cancer.ucsc.edu/proj/public/xena",
			"http://localhost:7222",
			"http://tcga1:1236"
		], defaultState = {
			activeHosts: defaultHosts,
			allHosts: defaultHosts,
			userHosts: defaultHosts
		}, stateJSON;

	function xenaHeatmapStateReset() {
		//all the initialization for xena heatmap is here // but does not reset servers.
		var state = sessionStorage.xena ? JSON.parse(sessionStorage.xena) : {servers: {user: []}};

		sessionStorage.xena = JSON.stringify(_.extend(state, resetXenaState));
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

		state.servers.user = _.map(JSON.parse(sessionStorage.state).userHosts, function (host) {
			return host === oldHost ? newHost : host;
		});

		sessionStorage.xena = JSON.stringify(state);
	}

	function sessionStorageInitialize() {
		var state = sessionStorage.state ? JSON.parse(sessionStorage.state) : {};
		sessionStorage.state = JSON.stringify(_.extend(defaultState, state));

		// the initialization for xena heatmap is here
		if (!sessionStorage.xena) {
			xenaHeatmapStateReset();
		}

		setXenaUserServer();
	}

	function hostCheckBox(host, ifChangedAction) {
		var userHosts = JSON.parse(sessionStorage.state).userHosts,
			checkbox = document.createElement("INPUT");
		checkbox.setAttribute("type", "checkbox");
		checkbox.setAttribute("id", "checkbox" + host);

		if (_.contains(userHosts, host)) {
			checkbox.checked = true;
		}

		checkbox.addEventListener('click', function () {
			var checked = checkbox.checked,
				stateJSON = JSON.parse(sessionStorage.state),
				newList;
			if (checked !== _.contains(stateJSON.userHosts, host)) {
				if (checked) { // add host
					newList = _.conj(stateJSON.userHosts, host);
				} else { // remove host
					newList = _.filter(stateJSON.userHosts, function (h) { return h !== host; });

					//check if host that will be removed has the "cohort" in the xena heatmap state setting ///////////TODO
					xenaQuery.all_cohorts(host).subscribe(function (s) {
						var xenaState = JSON.parse(sessionStorage.xena);
						if (xenaState.cohort && _.contains(s, xenaState.cohort)) { // reset xenaHeatmap
							xenaHeatmapStateReset();
						}
					});
				}
				stateJSON.userHosts = newList;
				sessionStorage.state = JSON.stringify(stateJSON);
				setXenaUserServer();

				if (ifChangedAction) {
					ifChangedAction.apply(null, arguments);
				}
			}
		});

		return checkbox;
	}

	function removeHostFromListInSession(list, host) {
		var state = JSON.parse(sessionStorage.state);
		state[list] = _.difference(state[list], [host]);
		sessionStorage.state = JSON.stringify(state);
	}

	function addHostToListInSession(list, host) {
		var state = JSON.parse(sessionStorage.state);
		state[list] = _.union(state[list], [host]);
		sessionStorage.state = JSON.stringify(state);
	}

	function updateHostStatus(host) {
		addHostToListInSession('allHosts', host);

		var node;

		xenaQuery.test_host(host).subscribe(function (s) {
			if (s) {
				// test if host can return useful data
				var start = Date.now();
				xenaQuery.all_cohorts(host).subscribe(function (s) {
					node = document.getElementById("status" + host);
					if (s.length > 0) {
						if (node) {
							node.parentNode.replaceChild(
								dom_helper.hrefLink(host, "?host=" + host), node);
						}
						addHostToListInSession('activeHosts', host);
					} else {
						var duration = Date.now() - start;
						if (duration > 3000) {
							if (node) {
								node.parentNode.replaceChild(
									dom_helper.elt("result2", dom_helper.hrefLink(host + " (there is a problem)", "?host=" + host)), node);
							}
						} else {
							if (node) {
								node.parentNode.replaceChild(
									dom_helper.elt("result2", dom_helper.hrefLink(host + " (no data)", "?host=" + host)), node);
							}
						}
						removeHostFromListInSession('activeHosts', host);
					}
				});
			} else {
				node = document.getElementById("status" + host);
				if (node) {
					node.parentNode.replaceChild(
						dom_helper.elt("result2", dom_helper.hrefLink(host + " (not running)", "?host=" + host)), node);
				}
				removeHostFromListInSession('activeHosts', host);
			}
		});
	}

	return {
		sessionStorageInitialize: sessionStorageInitialize,
		updateHostStatus: updateHostStatus,
		hostCheckBox: hostCheckBox
	};
});
