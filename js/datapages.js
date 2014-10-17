/*jslint browser:true, nomen: true*/
/*global define: false */

define(["dom_helper", "xenaQuery", "data", "underscore_ext"], function (dom_helper, xenaQuery, data, _) {
	'use strict';

	var hosts, /* hosts is the variable holds all hosts*/
		activeHosts,
		userHosts,
		query_string = dom_helper.queryStringToJSON();

	data.sessionStorageInitialize();
	hosts = JSON.parse(sessionStorage.state).allHosts; // all hosts
	activeHosts = JSON.parse(sessionStorage.state).activeHosts; // activatHosts
	userHosts = JSON.parse(sessionStorage.state).userHosts; // activatHosts

	hosts.forEach(function (host) {
		data.updateHostStatus(host);
	});

	// the short COHORT section
	function eachCohort(cohortName, hosts, mode) {
		var node = dom_helper.sectionNode("cohort"),
			nodeTitle, hostNode;

		//cohort title
		nodeTitle = dom_helper.hrefLink(cohortName + " cohort", "?cohort=" + encodeURIComponent(cohortName));

		if (mode === "multiple") {
			node.appendChild(dom_helper.elt("h3", dom_helper.elt("multiple", nodeTitle)));
		} else if (mode === "single") {
			node.appendChild(dom_helper.elt("h2", cohortName + " cohort"));
		}

		// samples: N node
		node.appendChild(dom_helper.labelValueNode("samples:", cohortName + "sampleN"));
		dom_helper.updateDOM_xenaCohort_sampleN(cohortName + "sampleN", hosts, cohortName);

		// update
		node.appendChild(dom_helper.valueNode(cohortName + "Update"));
		hosts.forEach(function (host) {
			xenaQuery.dataset_list([host], cohortName).subscribe(
				function (s) {
					var version;
					s[0].datasets.forEach(function (dataset) {
						var dataVersion = dataset.version;
						if (dataVersion) {
							if (!version) {
								version = dataVersion;
							} else if (version < dataVersion) {
								version = dataVersion;
							}
						}
					});
					if (version) {
						node = document.getElementById(cohortName + "Update");
						if (node.children.length === 0) {
							node.appendChild(dom_helper.elt("label", "updated on:"));
							node.appendChild(document.createTextNode(version));
						} else {
							node.appendChild(document.createTextNode("; " + version));
						}
					}
				});
		});

		// host: xxx
		hostNode = dom_helper.valueNode(cohortName + "Hosts");
		hosts.forEach(function (host) {
			xenaQuery.all_cohorts(host).subscribe(function (s) {
				if (s.indexOf(cohortName) !== -1) {
					if (hostNode.children.length === 0) {
						hostNode.appendChild(dom_helper.elt("label", "hosts:"));
						hostNode.appendChild(dom_helper.hrefLink(host, "?host=" + host));
					} else {
						hostNode.appendChild(document.createTextNode("; "));
						hostNode.appendChild(dom_helper.hrefLink(host, "?host=" + host));
					}
				}
			});
		});
		node.appendChild(hostNode);
		return node;
	}

	function cohortListPage(hosts, rootNode) {
		if (!hosts || hosts.length === 0) {
			return;
		}

		var cohortC = [];
		hosts.forEach(function (host) {
			xenaQuery.all_cohorts(host).subscribe(function (s) {
				var mode, node;
				s.sort().forEach(function (cohort) {
					if (cohortC.indexOf(cohort) !== -1) {
						return;
					}
					cohortC.push(cohort);
					data.checkGenomicDataset(hosts, cohort).subscribe(function (s) {
						if (s) {
							mode = "multiple";
							node = eachCohort(cohort, hosts, mode);
							rootNode.appendChild(node);
						}
					});
				});
			});
		});
	}


	//	build single COHORT page
	function cohortPage(cohortName, hosts) {
		//cohort section
		var mode = "single",
			node = eachCohort(cohortName, hosts, mode);
		document.body.appendChild(node);

		xenaQuery.dataset_list(hosts, cohortName).subscribe(
			function (s) {
				//collection information
				var dataType = {},
					dataLabel = {},
					dataDescription = {},
					dataHost = {},
					dataName = {};

				s.forEach(function (r) {
					var host = r.server,
						datasets = r.datasets;
					datasets.forEach(function (dataset) {
						var type = dataset.dataSubType,
							format = dataset.type,
							label = dataset.label,
							description = dataset.description,
							name = dataset.name,
							fullname = host + name;
						if (["genomicMatrix", "clinicalMatrix", "mutationVector"].indexOf(format) !== -1) {
							if (!label) {
								label = name;
							}
							if (!(dataType.hasOwnProperty(type))) {
								dataType[type] = [];
							}
							dataType[type].push(fullname);
							dataLabel[fullname] = label;
							dataDescription[fullname] = description;
							dataHost[fullname] = host;
							dataName[fullname] = name;
						}
					});
				});

				// dataType section
				var nodeDataType = dom_helper.sectionNode("dataType");

				var keys = Object.keys(dataType).sort(),
					i, type, displayType,
					listNode;
				for (i in keys) {
					type = keys[i];
					displayType = type;
					if (type === "undefined") {
						displayType = "others";
					}
					nodeDataType.appendChild(dom_helper.elt("header", displayType));
					listNode = dom_helper.elt("ul");
					dataType[type].sort().forEach(function (fullname) {
						// name
						var datasetNode = dom_helper.elt("li",
							dom_helper.hrefLink(dataLabel[fullname], "?dataset=" + dataName[fullname] + "&host=" + dataHost[fullname]));

						// samples: N
						datasetNode.appendChild(dom_helper.valueNode(fullname + "sampleN"));
						xenaQuery.dataset_samples(dataHost[fullname], dataName[fullname]).subscribe(function (s) {
							document.getElementById(fullname + "sampleN").
							appendChild(dom_helper.elt("label", document.createTextNode("(n=" + s.length.toLocaleString() + ")")));
						});

						// host if there are multiple hosts
						if (_.uniq(_.values(dataHost)).length > 1) {
							datasetNode.appendChild(dom_helper.elt(
								"result2", dom_helper.hrefLink(dataHost[fullname], "?host=" + dataHost[name])));
						}

						//dataset description
						if (dataDescription[fullname]) {
							var descriptionNode = dom_helper.elt("div");
							descriptionNode.setAttribute("class", "line-clamp");
							descriptionNode.appendChild(dom_helper.elt("summary", dom_helper.stripHTML(dataDescription[fullname])));

							datasetNode.appendChild(descriptionNode);
						}
						listNode.appendChild(datasetNode);
					});
					nodeDataType.appendChild(listNode);
				}

				document.body.appendChild(nodeDataType);

				// samples section
				var nodeSamples = dom_helper.elt("section");
				nodeSamples.setAttribute("id", "samples");
				nodeSamples.appendChild(dom_helper.elt("header", "Samples"));
				document.body.appendChild(nodeSamples);

				//////////////kind of hacky
				xenaQuery.all_samples(_.uniq(_.values(dataHost))[0], cohortName).subscribe(
					function (s) {
						var listNode = dom_helper.elt("ul");
						s.slice(0, 10).forEach(function (sample) {
							listNode.appendChild(dom_helper.elt(
								"li", dom_helper.hrefLink(sample, "?sample=" + sample + "&cohort=" + cohortName)));
						});
						if (s.length > 10) {
							listNode.appendChild(dom_helper.elt("sampleid", "..."));
						}
						nodeSamples.appendChild(listNode);
					});
				document.body.appendChild(dom_helper.elt("br"));
			});
	}

	// build single DATASET page  		//data example= "public/other/neuroblastoma_affy/expression";
	function datasetPage(dataset, host) {
		// collection
		var name = dataset.name,
			label = dataset.label || name,
			description = dataset.description,
			longTitle = dataset.longTitle,
			cohort = dataset.cohort,
			platform = dataset.platform,
			assembly = dataset.assembly,
			version = dataset.version,
			url = dataset.url,
			articletitle = dataset.articletitle,
			citation = dataset.citation,
			pmid = dataset.pmid,
			wrangling_procedure = dataset.wrangling_procedure,
			type = dataset.type,
			urls;

		if (description) {
			description = dom_helper.stripScripts(description);
		}

		if (wrangling_procedure) {
			wrangling_procedure = dom_helper.stripScripts(wrangling_procedure);
		}

		if (url) {
			urls = _.uniq(url.split(","));
		}

		// layout
		var sectionNode = dom_helper.sectionNode("dataset");

		// dataset title
		sectionNode.appendChild(dom_helper.elt("h2", label));

		// long title
		if (longTitle) {
			sectionNode.appendChild(document.createTextNode(longTitle));
			sectionNode.appendChild(dom_helper.elt("br"));
		}
		// cohort:xxx
		sectionNode.appendChild(dom_helper.elt("label", "chort:"));
		sectionNode.appendChild(dom_helper.elt("result", dom_helper.hrefLink(cohort, "?cohort=" + cohort)));

		// samples: n
		sectionNode.appendChild(dom_helper.labelValueNode("samples:", dataset + "SampleN"));
		dom_helper.updataDOM_xenaDataSet_sampleN(dataset + "SampleN", host, name);
		// update on: xxx
		if (version) {
			sectionNode.appendChild(dom_helper.elt("label", "version:"));
			sectionNode.appendChild(dom_helper.elt("result", version));
		}
		//  host: host
		sectionNode.appendChild(dom_helper.elt("label", "host:"));
		sectionNode.appendChild(dom_helper.elt("result", dom_helper.hrefLink(host, "?host=" + host)));
		sectionNode.appendChild(dom_helper.elt("br"));

		// assembly
		if (assembly || platform) {
			if (assembly) {
				sectionNode.appendChild(dom_helper.elt("label", "assembly:"));
				sectionNode.appendChild(dom_helper.elt("result", assembly));
			}
			//platform
			if (platform) {
				sectionNode.appendChild(dom_helper.elt("label", "platform:"));
				sectionNode.appendChild(dom_helper.elt("result", platform));
			}
			sectionNode.appendChild(dom_helper.elt("br"));
		}
		// Downlaod
		if (host === "https://genome-cancer.ucsc.edu/proj/public/xena") {
			sectionNode.appendChild(dom_helper.elt("label", "Download:"));
			var array = name.split("/"),
				link = "https://genome-cancer.ucsc.edu/download/public/xena/" + array.slice(1, array.length).join("/");
			sectionNode.appendChild(dom_helper.elt("result", dom_helper.hrefLink(link, link)));
			sectionNode.appendChild(dom_helper.elt("br"));
		}

		//description
		if (description) {
			sectionNode.appendChild(dom_helper.sectionNode("description"));

			var tmpNode = dom_helper.elt("description");
			tmpNode.innerHTML = description;

			sectionNode.appendChild(tmpNode);
		}
		document.body.appendChild(sectionNode);

		// others
		sectionNode = dom_helper.sectionNode("others");
		if (articletitle) {
			sectionNode.appendChild(dom_helper.elt("label", "Publication:"));
			sectionNode.appendChild(dom_helper.elt("result", articletitle));
			sectionNode.appendChild(dom_helper.elt("br"));
		}
		if (citation) {
			sectionNode.appendChild(dom_helper.elt("label", "Citation:"));
			sectionNode.appendChild(dom_helper.elt("result", citation));
			sectionNode.appendChild(dom_helper.elt("br"));
		}
		if (pmid && (typeof pmid) === "number") {
			sectionNode.appendChild(dom_helper.elt("label", "PMID:"));
			sectionNode.appendChild(
				dom_helper.elt("result", dom_helper.hrefLink(
					pmid.toString(), "http://www.ncbi.nlm.nih.gov/pubmed/?term=" + pmid.toString())));
			sectionNode.appendChild(dom_helper.elt("br"));
		}
		if (urls) {
			urls.forEach(function (url) {
				sectionNode.appendChild(dom_helper.elt("label", "Raw data:"));
				sectionNode.appendChild(dom_helper.elt("result", dom_helper.hrefLink(url, url)));
				sectionNode.appendChild(dom_helper.elt("br"));
			});
		}
		if (sectionNode.children.length > 0) {
			sectionNode.appendChild(dom_helper.elt("br"));
		}

		if (wrangling_procedure) {
			sectionNode.appendChild(dom_helper.elt("label", "Wrangling:"));

			var tmpNode = dom_helper.elt("result");
			tmpNode.innerHTML = wrangling_procedure;

			sectionNode.appendChild(tmpNode);
			sectionNode.appendChild(dom_helper.elt("br"));
		}
		if (sectionNode.children.length > 0) {
			document.body.appendChild(sectionNode);
		}

		sectionNode = dom_helper.sectionNode("others");
		sectionNode.appendChild(dom_helper.elt("header", "The dataset has the following variables:"));
		xenaQuery.dataset_field_examples(host, name).subscribe(function (s) {
			s.sort();
			if (type === "genomicMatrix") {
				s = s.slice(0, 10);
			}
			var listNode = dom_helper.elt("ul");
			s.forEach(function (o) {
				if (o.hasOwnProperty("name")) {
					listNode.appendChild(dom_helper.elt("identifiers", dom_helper.elt("li", o.name)));
				}
			});
			if ((type === "genomicMatrix" && s.length === 10) || (s.length === 100)) {
				listNode.appendChild(dom_helper.elt("identifiers1", "..."));
			}
			sectionNode.appendChild(listNode);
		});
		document.body.appendChild(sectionNode);
	}

	// build single SAMPLE page
	function samplePage(sample, cohort) {
		// layout
		var sectionNode = dom_helper.sectionNode("dataset");

		// sample title
		var nodeTitle = dom_helper.hrefLink(sample, "?sample=" + sample + "&cohort=" + cohort);
		sectionNode.appendChild(dom_helper.elt("h3", nodeTitle));
		sectionNode.appendChild(dom_helper.elt("label", "cohort:"));
		sectionNode.appendChild(dom_helper.elt("result", dom_helper.hrefLink(cohort, "?&cohort=" + cohort)));

		document.body.appendChild(sectionNode);
	}

	//parse current url to see if it is a query string
	// if there is no url query string, query xena find the cohorts on main server
	var host,
		cohort;

	// ?host=id
	if ((query_string.hasOwnProperty("host")) && !(query_string.hasOwnProperty("dataset"))) {

		host = decodeURIComponent(query_string.host);

		// host title
		var node = dom_helper.sectionNode("host");
		var tmpNode = dom_helper.hrefLink(host + " (connecting)", "index.html?host=" + host);
		tmpNode.setAttribute("id", "status" + host);

		node.appendChild(dom_helper.elt("h3", tmpNode));
		data.updateHostStatus(host);
		document.body.appendChild(node);

		// cohort list
		cohortListPage([host], document.body);
	}

	// ?cohort=id
	else if ((query_string.hasOwnProperty("cohort")) && !(query_string.hasOwnProperty("sample"))) {
		cohort = decodeURIComponent(query_string.cohort);
		data.ifCohortExistDo(cohort, activeHosts, function () {
			cohortPage(cohort, _.intersection(activeHosts, userHosts));
		});
	}

	// ?dataset=id & host=id
	else if ((query_string.hasOwnProperty("dataset")) && (query_string.hasOwnProperty("host"))) {
		var dataset = decodeURIComponent(query_string.dataset);
		host = decodeURIComponent(query_string.host);
		xenaQuery.dataset_by_name(host, dataset).subscribe(
			function (s) {
				if (s.length) {
					datasetPage(s[0], host);
				}
			}
		);
	}

	// ?sample=id&cohort=id
	else if ((query_string.hasOwnProperty("cohort")) && (query_string.hasOwnProperty("sample"))) {
		var sample = decodeURIComponent(query_string.sample);
		cohort = decodeURIComponent(query_string.cohort);
		data.ifCohortExistDo(cohort, activeHosts, function () {
			samplePage(sample, cohort);
		});
	} else {
		var container = dom_helper.elt("div");
		container.setAttribute("id", "content-container");

		//checkbox sidebar
		var sideNode = dom_helper.elt("div");
		sideNode.setAttribute("id", "sidebar");
		container.appendChild(sideNode);

		var checkNode = dom_helper.sectionNode("sidehub");

		checkNode.appendChild(dom_helper.elt("h2", dom_helper.hrefLink("Current Data Hubs", "hub.html")));
		checkNode.appendChild(dom_helper.elt("br"));

		userHosts.forEach(function (host) {
			var tmpNode = dom_helper.elt("result2", dom_helper.hrefLink(host + " (connecting)", "index.html?host=" + host));
			tmpNode.setAttribute("id", "status" + host);
			checkNode.appendChild(dom_helper.elt("h4", tmpNode));
			checkNode.appendChild(dom_helper.elt("br"));
		});

		sideNode.appendChild(checkNode);

		//cohort list page
		var mainNode = dom_helper.elt("div");
		mainNode.setAttribute("id", "main");
		mainNode.appendChild(dom_helper.elt("h2", "Cohorts"));

		cohortListPage(_.intersection(activeHosts, userHosts), mainNode);
		container.appendChild(mainNode);
		document.body.appendChild(container);
	}
});
