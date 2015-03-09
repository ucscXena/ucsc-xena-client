/*jslint browser:true */
/*global define: false */
define(["xenaQuery", "rx", "dom_helper", "underscore_ext"], function (xenaQuery, Rx, dom_helper, _) {
	'use strict';

	function xenaHeatmapStateReset() {
		var xenaStateResets = {
				samples: [],
				samplesFrom: "",
				zoomIndex: 0,
				zoomCount: 100,
				column_rendering: {},
				column_order: [],
				cohort: "",
				mode: "heatmap"
			},
			state = sessionStorage.xena ? JSON.parse(sessionStorage.xena) : {servers: {user: []}};
		sessionStorage.xena = JSON.stringify(_.extend(state, xenaStateResets));
	}

	function xenaHeatmapSetCohort(cohortname) {
		var xenaState = {
				cohort: cohortname
			},
			state = sessionStorage.xena ? JSON.parse(sessionStorage.xena) : {servers: {user: []}};

		if ( state.cohort && state.cohort!==cohortname) {
			xenaHeatmapStateReset();
			state = sessionStorage.xena ? JSON.parse(sessionStorage.xena) : {servers: {user: []}};
		}
		sessionStorage.xena = JSON.stringify(_.extend(state, xenaState));
	}

	//set xena user server
	function setXenaUserServer() {
		if (!sessionStorage.xena) {
			xenaHeatmapStateReset();
		}

		var state = JSON.parse(sessionStorage.xena);

		state.servers.user = _.intersection(JSON.parse(sessionStorage.state).activeHosts,
			JSON.parse(sessionStorage.state).userHosts);

		sessionStorage.xena = JSON.stringify(state);
	}

	function datasetHasFloats (host, dsName, action, actionArgs) {
		xenaQuery.dataset_field_examples(host, dsName).subscribe(function (s) {
			var probes = s.map(function (probe) {
				return probe.name;
			});
			xenaQuery.code_list(host, dsName, probes).subscribe(function(codemap){
				for(var key in codemap) {
		    	if (!codemap[key]){  // no code, float feature
		    		action.apply(this,actionArgs);
		    		return;
		    	}
		    }
			});
		});
	}

	function sessionStorageInitialize() {
		var defaultHosts = [
				"https://genome-cancer.ucsc.edu:443/proj/public/xena",
				"https://local.xena.ucsc.edu:7223"
			],
			defaultActive =["https://genome-cancer.ucsc.edu:443/proj/public/xena"],
			defaultLocal = "https://local.xena.ucsc.edu:7223",
			defaultState = {
				activeHosts: defaultActive,
				allHosts: defaultHosts,
				userHosts: defaultHosts,
				localHost: defaultLocal,
				metadataFilterHosts: defaultHosts
			},
			state = getSessionStorageState(); //sessionStorage.state ? JSON.parse(sessionStorage.state) : {};

		sessionStorage.state = JSON.stringify(_.extend(defaultState, state));
		setXenaUserServer();
	}

	function getSessionStorageState () {
			return sessionStorage.state ? JSON.parse(sessionStorage.state) : {};
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

	function hostCheckBox(host) {
		var userHosts = JSON.parse(sessionStorage.state).userHosts,
			node = dom_helper.elt("div"),
			checkbox = document.createElement("INPUT"),
			labelText = dom_helper.elt('label');

		function checkBoxLabel() {
			if (checkbox.checked){
				labelText.style.color="gray";
				labelText.innerHTML= "selected";
			}
			else {
				labelText.innerHTML= "&nbsp";
			}
			updateHostStatus(host);
		}

		checkbox.setAttribute("type", "checkbox");
		checkbox.setAttribute("id", "checkbox" + host);
		checkbox.setAttribute("class","hubcheck");
		checkbox.checked = _.contains(userHosts, host);
		labelText.setAttribute("for", "checkbox" + host);
		labelText.setAttribute("id", "hubLabel"+host);
		checkBoxLabel();

		node.appendChild(checkbox);
		node.appendChild(labelText);

		checkbox.addEventListener('click', function () {
			var checked = checkbox.checked,
				stateJSON = JSON.parse(sessionStorage.state),
				newList;
			if (checked !== _.contains(stateJSON.userHosts, host)) {
				if (checked) { // add host
					addHostToListInSession('userHosts', host);
					addHostToListInSession('metadataFilterHosts', host);
				} else { // remove host
					removeHostFromListInSession('userHosts', host);
					removeHostFromListInSession('metadataFilterHosts', host);

					//check if host that will be removed has the "cohort" in the xena heatmap state setting ///////////TODO
					xenaQuery.all_cohorts(host).subscribe(function (s) {
						var xenaState = JSON.parse(sessionStorage.xena);
						if (xenaState.cohort && _.contains(s, xenaState.cohort)) { // reset xenaHeatmap
							xenaHeatmapStateReset();
						}
					});
				}
				setXenaUserServer();
				checkBoxLabel();
			}
		});

		return node;
	}

	function metaDataFilterCheckBox(host, ifChangedAction) {
		var userHosts = JSON.parse(sessionStorage.state).userHosts,
				metadataFilterHosts= JSON.parse(sessionStorage.state).metadataFilterHosts,
				checkbox = document.createElement("INPUT");

		checkbox.setAttribute("type", "checkbox");
		checkbox.setAttribute("id", "checkbox" + host);
		checkbox.checked = _.contains(metadataFilterHosts, host);

		checkbox.addEventListener('click', function () {
			var checked = checkbox.checked,
				stateJSON = JSON.parse(sessionStorage.state),
				newList;
			if (checked !== _.contains(stateJSON.metadataFilterHosts, host)) {
				if (checked) { // add host
					addHostToListInSession('metadataFilterHosts', host);
				} else { // remove host
					removeHostFromListInSession('metadataFilterHosts', host);
				}
				if (ifChangedAction) {
					ifChangedAction.apply(null, arguments);
				}
			}
		});

		return checkbox;
	}

	function updateHostDOM(host, status) {
		var display = {
				'live_selected': {msg: '', el: 'result'},
				'live_unselected': {msg: ' (running, not in data hubs)', el: 'result2'},
				'dead': {msg: ' (not running)', el: 'result2'},
				'nodata': {msg: ' (no data)', el: 'result2'},
				'slow': {msg: ' (there is a problem)', el: 'result2'},
			},
			displayHubPage = {
				'live_selected': {msg: '', el: 'result'},
				'live_unselected': {msg: '', el: 'result'},
				'dead': {msg: ' (not running)', el: 'result2'},
				'nodata': {msg: ' (no data)', el: 'result2'},
				'slow': {msg: ' (there is a problem)', el: 'result2'},
			},
			displayHubLabel = {
				'live_selected': {msg: 'connected', color: 'blue'},
				'live_unselected': {msg: '&nbsp', color: 'white'},
			},

			node = document.getElementById("status" + host),
			nodeHubPage = document.getElementById("statusHub" + host),
			nodeHubLabel = document.getElementById("hubLabel" + host),
			nodeHubCheck = document.getElementById("checkbox" + host);

		if (node) {
			node.parentNode.replaceChild(
				dom_helper.elt(display[status].el, dom_helper.hrefLink(host + display[status].msg,
					"../datapages/?host=" + host)), node);
		}
		if (nodeHubPage) {
			nodeHubPage.parentNode.replaceChild(
				dom_helper.elt(displayHubPage[status].el, dom_helper.hrefLink(host + displayHubPage[status].msg,
					"../datapages/?host=" + host)), nodeHubPage);
		}
		if (nodeHubLabel && displayHubLabel[status]){
			if (displayHubLabel[status].color){
				nodeHubLabel.style.color= displayHubLabel[status].color;
				nodeHubCheck.style.background = "linear-gradient("+displayHubLabel[status].color+", white)";
			}
			if (displayHubLabel[status].msg) {
				nodeHubLabel.innerHTML = displayHubLabel[status].msg;
			}
		}
	}

	function updateHostStatus(host) {
		var userHosts = JSON.parse(sessionStorage.state).userHosts;
		addHostToListInSession('allHosts', host);

		xenaQuery.test_host(host).subscribe(function (s) {
			if (s) {
				// test if host can return useful data
				var start = Date.now();
				xenaQuery.all_cohorts(host).subscribe(function (s) {
					var duration;
					if (s.length > 0) {
						addHostToListInSession('activeHosts', host);
						updateHostDOM(host, (userHosts.indexOf(host)!==-1)? 'live_selected' : 'live_unselected');
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

	var GOODSTATUS = "loaded";

	return {
		sessionStorageInitialize: sessionStorageInitialize,
		updateHostStatus: updateHostStatus,
		hostCheckBox: hostCheckBox,
		metaDataFilterCheckBox: metaDataFilterCheckBox,
		xenaHeatmapSetCohort: xenaHeatmapSetCohort,

		datasetHasFloats:datasetHasFloats,

		GOODSTATUS: GOODSTATUS
	};
});
