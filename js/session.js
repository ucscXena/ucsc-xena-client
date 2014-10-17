/*jslint browser:true */
/*global define: false */
define(["xenaQuery", "rx", "dom_helper", "underscore_ext"], function (xenaQuery, Rx, dom_helper, _) {
	'use strict';

	var stateJSON;

	function xenaHeatmapStateReset() {
		//all the initialization for xena heatmap is here // but does not reset servers.
		if (sessionStorage.hasOwnProperty("xena")) {
			stateJSON = JSON.parse(sessionStorage.xena);
		} else {
			stateJSON = {};
			stateJSON.servers = {
				"user": []
			};
		}

		stateJSON.samples = [];
		stateJSON.samplesFrom = "";
		stateJSON.height = 717;
		stateJSON.zoomIndex = 0;
		stateJSON.zoomCount = 0;
		stateJSON.column_rendering = {};
		stateJSON.column_order = [];
		stateJSON.cohort = "";

		sessionStorage.xena = JSON.stringify(stateJSON);
	}

	//set xena user server
	function setXenaUserServer() {
		if (!sessionStorage.hasOwnProperty("xena")) {
			xenaHeatmapStateReset();
		}
		stateJSON = JSON.parse(sessionStorage.xena);
		stateJSON.servers.user = JSON.parse(sessionStorage.state).userHosts;

		// genome-cancer :443 switch
		var oldHost = "https://genome-cancer.ucsc.edu/proj/public/xena",
			newHost = "https://genome-cancer.ucsc.edu:443/proj/public/xena",
			pos;

		if (stateJSON.servers.user.indexOf(oldHost) !== -1) {
			pos = stateJSON.servers.user.indexOf(oldHost);
			stateJSON.servers.user.splice(pos, 1, newHost);
		}
		sessionStorage.xena = JSON.stringify(stateJSON);
	}

	function sessionStorageInitialize() {
		var defaultHosts = [
			"https://genome-cancer.ucsc.edu/proj/public/xena",
			"http://localhost:7222",
			"http://tcga1:1236"
			//"http://tcga1:7223",
		];

		//activeHosts from sessionStorage
		if (!sessionStorage.hasOwnProperty('state')) {
			stateJSON = {};
			sessionStorage.state = JSON.stringify(stateJSON);
		}
		if (!JSON.parse(sessionStorage.state).hasOwnProperty('activeHosts')) {
			stateJSON = JSON.parse(sessionStorage.state);
			stateJSON.activeHosts = defaultHosts;
			sessionStorage.state = JSON.stringify(stateJSON);
		}
		if (!JSON.parse(sessionStorage.state).hasOwnProperty('allHosts')) {
			stateJSON = JSON.parse(sessionStorage.state);
			stateJSON.allHosts = defaultHosts;
			sessionStorage.state = JSON.stringify(stateJSON);
		}
		if (!JSON.parse(sessionStorage.state).hasOwnProperty('userHosts')) {
			stateJSON = JSON.parse(sessionStorage.state);
			stateJSON.userHosts = defaultHosts;
			sessionStorage.state = JSON.stringify(stateJSON);
		}
		// the initialization for xena heatmap is here
		if (!sessionStorage.hasOwnProperty('xena')) {
			xenaHeatmapStateReset();
		}

		setXenaUserServer();
	}

	function hostCheckBox(host, ifChangedAction) {
		var userHosts = JSON.parse(sessionStorage.state).userHosts,
			checkbox = document.createElement("INPUT");
		checkbox.setAttribute("type", "checkbox");
		checkbox.setAttribute("id", "checkbox" + host);

		if (userHosts.indexOf(host) !== -1) {
			checkbox.checked = true;
		}

		checkbox.addEventListener('click', function () {
			var checked = checkbox.checked,
				stateJSON = JSON.parse(sessionStorage.state),
				changed = false;
			if (checked !== (stateJSON.userHosts.indexOf(host) !== -1)) {
				changed = true;

				if (checked) { // add host
					stateJSON.userHosts.push(host);
				} else { // remove host
					var list = stateJSON.userHosts,
						i,
						newList = [];
					for (i = 0; i < list.length; i = i + 1) {
						if (host !== list[i]) {
							newList.push(list[i]);
						}
					}
					list = newList;
					stateJSON.userHosts = list;

					//check if host that will be removed has the "cohort" in the xena heatmap state setting ///////////TODO

					xenaQuery.all_cohorts(host).subscribe(function (s) {
						stateJSON = JSON.parse(sessionStorage.xena);
						if (stateJSON.hasOwnProperty("cohort") && s.indexOf(stateJSON.cohort) !== -1) { // reset xenaHeatmap
							xenaHeatmapStateReset();
						}
					});
				}
				sessionStorage.state = JSON.stringify(stateJSON);
				setXenaUserServer();

				if (changed && ifChangedAction) {
					ifChangedAction.apply(null, arguments);
				}
			}
		});

		return checkbox;
	}

	function removeHostFromActiveHostsInSession(host) {
		if (sessionStorage.hasOwnProperty("state") && JSON.parse(sessionStorage.state).hasOwnProperty("activeHosts")) {
			stateJSON = JSON.parse(sessionStorage.state);
			if (stateJSON.activeHosts.indexOf(host) !== -1) {
				stateJSON.activeHosts.splice(stateJSON.activeHosts.indexOf(host), 1);
				sessionStorage.state = JSON.stringify(stateJSON);
			}
		} else {
			stateJSON.activeHosts = [host];
			sessionStorage.state = JSON.stringify(stateJSON);
		}
	}

	function addHostToActiveHostsInSession(host) {
		if (sessionStorage.hasOwnProperty("state") && JSON.parse(sessionStorage.state).hasOwnProperty("activeHosts")) {
			stateJSON = JSON.parse(sessionStorage.state);
			if (stateJSON.activeHosts.indexOf(host) === -1) {
				stateJSON.activeHosts.push(host);
				sessionStorage.state = JSON.stringify(stateJSON);
			}
		}
	}

	function updateHostStatus(host) {
		// JSON.parse(sessionStorage.state).allHosts
		if (JSON.parse(sessionStorage.state).allHosts.indexOf(host) === -1) {
			stateJSON = JSON.parse(sessionStorage.state);
			stateJSON.allHosts.push(host);
			sessionStorage.state = JSON.stringify(stateJSON);
		}

		var node;

		// JSON.parse(sessionStorage.state).activeHosts is the hosts that we think are currently functional
		xenaQuery.test_host(host).subscribe(function (s) {
			if (s) {
				// test if host can return useful data
				var start = Date.now();
				xenaQuery.all_cohorts(host).subscribe(function (s) {
					node = document.getElementById("status" + host);
					if (s.length > 0) {
						if (node) {
							node.parentNode.replaceChild(
								dom_helper.hrefLink(host, "index.html?host=" + host), node);
						}
						addHostToActiveHostsInSession(host);
					} else {
						var duration = Date.now() - start;
						if (duration > 3000) {
							if (node) {
								node.parentNode.replaceChild(
									dom_helper.elt("result2", dom_helper.hrefLink(host + " (there is a problem)", "index.html?host=" + host)), node);
							}
						} else {
							if (node) {
								node.parentNode.replaceChild(
									dom_helper.elt("result2", dom_helper.hrefLink(host + " (no data)", "index.html?host=" + host)), node);
							}
						}
						removeHostFromActiveHostsInSession(host);
					}
				});
			} else {
				node = document.getElementById("status" + host);
				if (node) {
					node.parentNode.replaceChild(
						dom_helper.elt("result2", dom_helper.hrefLink(host + " (not running)", "index.html?host=" + host)), node);
				}
				removeHostFromActiveHostsInSession(host);
			}
		});
	}

	return {
		sessionStorageInitialize: sessionStorageInitialize,
		updateHostStatus: updateHostStatus,
		hostCheckBox: hostCheckBox
	};
});
