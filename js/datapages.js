/*jslint browser:true */
/*jslint nomen: true*/
/*global _: true */
/*global define: false */

define(["jing_helper","xenaQuery","data"], function (jing_helper,xenaQuery,data) {
        'use strict';

		var hosts,     /* hosts is the variable holds all hosts*/
			activeHosts,
			userHosts,
			query_string = jing_helper.queryStringToJSON();

        data.sessionStorageInitialize();
		hosts = JSON.parse(sessionStorage.state).allHosts;  // all hosts
		activeHosts = JSON.parse(sessionStorage.state).activeHosts; // activatHosts
		userHosts = JSON.parse(sessionStorage.state).userHosts; // activatHosts

		hosts.forEach(function(host){
			data.updateHostStatus (host);
		});

		// the short COHORT section
		function eachCohort (cohortName, hosts, mode) {
			var node = jing_helper.sectionNode ("cohort"), nodeTitle, hostNode;

			//cohort title
			nodeTitle = jing_helper.hrefLink (cohortName+" cohort", "?cohort="+encodeURIComponent(cohortName));

			if (mode==="multiple") {
				node.appendChild(jing_helper.elt ("h3", jing_helper.elt("multiple", nodeTitle)));
			}
			else if (mode ==="single") {
				node.appendChild(jing_helper.elt ("h2", cohortName+ " cohort"));
			}

			// samples: N node
			node.appendChild(jing_helper.labelValueNode("samples:",cohortName+"sampleN"));
			jing_helper.updateDOM_xenaCohort_sampleN (cohortName+"sampleN", hosts, cohortName);

			// update
			node.appendChild(jing_helper.valueNode(cohortName+"Update"));
			hosts.forEach(function(host){
				xenaQuery.dataset_list([host], cohortName).subscribe(
					function (s){
						var version;
						s[0].datasets.forEach(function (dataset){
							var dataVersion = dataset.version;
							if (dataVersion) {
								if (!version) {version =dataVersion;}
								else if (version < dataVersion) {version = dataVersion;}
							}
						});
						if (version){
							node = document.getElementById(cohortName+"Update");
							if (node.children.length===0){
								node.appendChild(jing_helper.elt ("label","updated on:"));
								node.appendChild(document.createTextNode(version));
							}
							else{
								node.appendChild(document.createTextNode("; "+version));
							}
						}
					});
			});

			// host: xxx
			hostNode =jing_helper.valueNode(cohortName+"Hosts");
			hosts.forEach(function(host){
				xenaQuery.all_cohorts(host).subscribe(function(s){
				if (s.indexOf(cohortName)!==-1){
					if (hostNode.children.length===0){
						hostNode.appendChild(jing_helper.elt("label","hosts:"));
						hostNode.appendChild(jing_helper.hrefLink(host,"?host="+host));
					}
					else{
						hostNode.appendChild(document.createTextNode("; "));
						hostNode.appendChild(jing_helper.hrefLink(host,"?host="+host));
					}
				}
				});
			});
			node.appendChild(hostNode);
			return node;
		}

		function cohortListPage (hosts, rootNode){
			if (!hosts || hosts.length===0) {
				return;
			}

			var cohortC=[];
			hosts.forEach(function(host) {
				xenaQuery.all_cohorts (host).subscribe ( function(s){
					var mode, node;
					s.sort().forEach(function (cohort) {
						if (cohortC.indexOf(cohort)!==-1) {
							return;
						}
						cohortC.push(cohort);
						data.checkGenomicDataset (hosts, cohort).subscribe(function(s){
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
		function cohortPage(cohortName,hosts){
			//cohort section
			var mode="single",
				 node = eachCohort(cohortName, hosts, mode);
			document.body.appendChild(node);

			xenaQuery.dataset_list(hosts, cohortName).subscribe(
				function (s) {
					//collection information
					var dataType = {},
						dataLabel = {},
						dataDescription={},
						dataHost ={},
						dataName ={};

					s.forEach( function (r) {
						var host = r.server,
							datasets = r.datasets;
						datasets.forEach (function (dataset){
							var type = dataset.dataSubType,
								format = dataset.type,
								label = dataset.label,
								description = dataset.description,
								name = dataset.name,
								fullname=host+name;
							if (["genomicMatrix","clinicalMatrix","mutationVector"].indexOf(format)!==-1){
								if (!label) {label =name;}
								if (!(dataType.hasOwnProperty(type))) {dataType[type]=[];}
								dataType[type].push(fullname);
								dataLabel[fullname]=label;
								dataDescription[fullname]=description;
								dataHost[fullname] = host;
								dataName[fullname] = name;
							}
						});
					});

					// dataType section
					var nodeDataType= jing_helper.sectionNode("dataType");

					var keys = Object.keys(dataType).sort(),
						i, type, displayType,
						listNode;
					for ( i in keys) {
						type =keys[i];
						displayType=type;
						if (type === "undefined") {
							displayType ="others";
						}
						nodeDataType.appendChild(jing_helper.elt("header", displayType));
						listNode = jing_helper.elt("ul");
						dataType[type].sort().forEach( function(fullname){
							// name
							var datasetNode = jing_helper.elt("li",
								jing_helper.hrefLink (dataLabel[fullname], "?dataset="+dataName[fullname]+"&host="+dataHost[fullname]));

							// samples: N
							datasetNode.appendChild(jing_helper.valueNode(fullname+"sampleN"));
							xenaQuery.dataset_samples(dataHost[fullname],dataName[fullname]).subscribe( function(s) {
								document.getElementById(fullname+"sampleN").
								appendChild(jing_helper.elt("label",document.createTextNode("(n="+s.length.toLocaleString()+")")));
							});

							// host if there are multiple hosts
							if ( _.uniq(_.values(dataHost)).length>1){
								datasetNode.appendChild(jing_helper.elt (
									"result2", jing_helper.hrefLink(dataHost[fullname],"?host="+dataHost[name])));
							}

							//dataset description
							if (dataDescription[fullname]){
								var descriptionNode =jing_helper.elt("div");
								descriptionNode.setAttribute("class", "line-clamp");
								descriptionNode.appendChild(jing_helper.elt("summary", jing_helper.stripHTML(dataDescription[fullname])));

								datasetNode.appendChild(descriptionNode);
							}
							listNode.appendChild(datasetNode);
						});
						nodeDataType.appendChild(listNode);
					}

					document.body.appendChild(nodeDataType);

					// samples section
					var nodeSamples= jing_helper.elt ("section");
					nodeSamples.setAttribute("id", "samples");
					nodeSamples.appendChild(jing_helper.elt("header","Samples"));
					document.body.appendChild(nodeSamples);

					//////////////kind of hacky
					xenaQuery.all_samples(_.uniq(_.values(dataHost))[0], cohortName).subscribe(
						function(s) {
							var listNode = jing_helper.elt("ul");
							s.slice(0,10).forEach(function(sample){
								listNode.appendChild(jing_helper.elt(
									"li", jing_helper.hrefLink (sample, "?sample="+sample+"&cohort="+cohortName)));
							});
							if (s.length>10) {
								listNode.appendChild(jing_helper.elt("sampleid","..."));
							}
							nodeSamples.appendChild(listNode);
						});
					document.body.appendChild(jing_helper.elt("br"));
				});
		}

		// build single DATASET page  		//data example= "public/other/neuroblastoma_affy/expression";
		function datasetPage (dataset, host) {
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
				description = jing_helper.stripScripts(description);
			}

			if (wrangling_procedure) {
				wrangling_procedure = jing_helper.stripScripts(wrangling_procedure);
			}

			if (url) {
				urls = _.uniq(url.split(","));
			}

			// layout
			var sectionNode = jing_helper.sectionNode("dataset");

			// dataset title
			sectionNode.appendChild(jing_helper.elt("h2",label));

			// long title
			if (longTitle) {
				sectionNode.appendChild(document.createTextNode(longTitle));
				sectionNode.appendChild(jing_helper.elt("br"));
			}
			// cohort:xxx
			sectionNode.appendChild(jing_helper.elt("label","chort:"));
			sectionNode.appendChild(jing_helper.elt("result",jing_helper.hrefLink(cohort,"?cohort="+cohort)));

			// samples: n
			sectionNode.appendChild(jing_helper.labelValueNode("samples:", dataset+"SampleN"));
			jing_helper.updataDOM_xenaDataSet_sampleN (dataset+"SampleN", host, name);
			// update on: xxx
			if (version){
				sectionNode.appendChild(jing_helper.elt("label","version:"));
				sectionNode.appendChild(jing_helper.elt("result",version));
			}
			//  host: host
			sectionNode.appendChild(jing_helper.elt("label","host:"));
			sectionNode.appendChild(jing_helper.elt("result",jing_helper.hrefLink(host,"?host="+host)));
			sectionNode.appendChild(jing_helper.elt("br"));

			// assembly
			if(assembly || platform) {
				if (assembly) {
					sectionNode.appendChild(jing_helper.elt("label","assembly:"));
					sectionNode.appendChild(jing_helper.elt("result",assembly));
				}
			//platform
				if (platform){
					sectionNode.appendChild(jing_helper.elt("label","platform:"));
					sectionNode.appendChild(jing_helper.elt("result",platform));
				}
				sectionNode.appendChild(jing_helper.elt("br"));
			}
			// Downlaod
			if (host === "https://genome-cancer.ucsc.edu/proj/public/xena"){
				sectionNode.appendChild(jing_helper.elt("label","Download:"));
				var array = name.split("/"),
					link = "https://genome-cancer.ucsc.edu/download/public/xena/"+	array.slice(1,array.length).join("/");
				sectionNode.appendChild(jing_helper.elt("result", jing_helper.hrefLink(link,link)));
				sectionNode.appendChild(jing_helper.elt("br"));
			}

			//description
			if (description) {
				sectionNode.appendChild(jing_helper.sectionNode("description"));

				var tmpNode = jing_helper.elt("description");
				tmpNode.innerHTML= description;

				sectionNode.appendChild(tmpNode);
			}
			document.body.appendChild(sectionNode);

			// others
			sectionNode= jing_helper.sectionNode("others");
			if (articletitle){
				sectionNode.appendChild(jing_helper.elt("label","Publication:"));
				sectionNode.appendChild(jing_helper.elt("result", articletitle));
				sectionNode.appendChild(jing_helper.elt("br"));
			}
			if (citation){
				sectionNode.appendChild(jing_helper.elt("label","Citation:"));
				sectionNode.appendChild(jing_helper.elt("result", citation));
				sectionNode.appendChild(jing_helper.elt("br"));
			}
			if (pmid && (typeof pmid)=== "number") {
				sectionNode.appendChild(jing_helper.elt("label","PMID:"));
				sectionNode.appendChild(
					jing_helper.elt("result", jing_helper.hrefLink (
						pmid.toString(), "http://www.ncbi.nlm.nih.gov/pubmed/?term="+pmid.toString())));
				sectionNode.appendChild(jing_helper.elt("br"));
			}
			if (urls){
				urls.forEach(function(url){
					sectionNode.appendChild(jing_helper.elt("label","Raw data:"));
					sectionNode.appendChild(jing_helper.elt("result", jing_helper.hrefLink (url, url)));
					sectionNode.appendChild(jing_helper.elt("br"));
				});
			}
			if (sectionNode.children.length>0) {
				sectionNode.appendChild(jing_helper.elt("br"));
			}

			if (wrangling_procedure){
				sectionNode.appendChild(jing_helper.elt("label","Wrangling:"));

				var tmpNode = jing_helper.elt("result");
				tmpNode.innerHTML= wrangling_procedure;

				sectionNode.appendChild(tmpNode);
				sectionNode.appendChild(jing_helper.elt("br"));
			}
			if (sectionNode.children.length>0) {
				document.body.appendChild(sectionNode);
			}

			sectionNode= jing_helper.sectionNode("others");
			sectionNode.appendChild(jing_helper.elt("header","The dataset has the following variables:"));
			xenaQuery.dataset_field_examples(host,name).subscribe(function(s){
					s.sort();
					if (type==="genomicMatrix") {
						s=s.slice(0,10);
					}
					var listNode=jing_helper.elt("ul");
					s.forEach(function(o) {
						if (o.hasOwnProperty("name")) {
							listNode.appendChild(jing_helper.elt("identifiers",jing_helper.elt("li",o.name)));
						}
					});
					if ((type==="genomicMatrix" && s.length===10) || (s.length===100)) {
						listNode.appendChild(jing_helper.elt("identifiers1","..."));
					}
					sectionNode.appendChild(listNode);
				});
			document.body.appendChild(sectionNode);
		}

		// build single SAMPLE page
		function samplePage(sample,cohort) {
			// layout
			var sectionNode = jing_helper.sectionNode("dataset");

			// sample title
			var nodeTitle = jing_helper.hrefLink (sample, "?sample="+sample+"&cohort="+cohort);
			sectionNode.appendChild(jing_helper.elt ("h3", nodeTitle));
			sectionNode.appendChild(jing_helper.elt("label", "cohort:"));
			sectionNode.appendChild(jing_helper.elt("result", jing_helper.hrefLink (cohort, "?&cohort="+cohort)));

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
			var node = jing_helper.sectionNode("host");
			var tmpNode = jing_helper.hrefLink(host+" (connecting)","index.html?host="+host);
			tmpNode.setAttribute("id","status"+host);

			node.appendChild(jing_helper.elt("h3",tmpNode));
			data.updateHostStatus (host);
			document.body.appendChild(node);

			// cohort list
			cohortListPage([host], document.body);
		}

		// ?cohort=id
		else if ((query_string.hasOwnProperty("cohort")) && !(query_string.hasOwnProperty("sample"))) {
			cohort = decodeURIComponent(query_string.cohort);
			data.ifCohortExistDo(cohort, activeHosts, function() {cohortPage (cohort, _.intersection(activeHosts, userHosts));});
		}

		// ?dataset=id & host=id
		else if ((query_string.hasOwnProperty("dataset")) && (query_string.hasOwnProperty("host"))) {
			var dataset = decodeURIComponent(query_string.dataset);
			host = decodeURIComponent(query_string.host);
			xenaQuery.dataset_by_name(host, dataset).subscribe(
				function(s) {
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
			data.ifCohortExistDo(cohort, activeHosts, function() {
				samplePage (sample, cohort);
			});
		}

		else {
			var container = jing_helper.elt("div");
			container.setAttribute("id","content-container");

			//checkbox sidebar
			var sideNode = jing_helper.elt("div");
			sideNode.setAttribute("id","sidebar");
			container.appendChild(sideNode);

			var checkNode = jing_helper.sectionNode("sidehub");

			checkNode.appendChild(jing_helper.elt("h2",jing_helper.hrefLink("Current Data Hubs","hub.html")));
			checkNode.appendChild(jing_helper.elt("br"));

			userHosts.forEach(function(host){
				var	tmpNode = jing_helper.elt("result2", jing_helper.hrefLink(host+" (connecting)","index.html?host="+host));
				tmpNode.setAttribute("id","status"+host);
				checkNode.appendChild(jing_helper.elt("h4", tmpNode));
				checkNode.appendChild(jing_helper.elt("br"));
			});

		    sideNode.appendChild(checkNode);

		    //cohort list page
			var mainNode = jing_helper.elt("div");
			mainNode.setAttribute("id","main");
			mainNode.appendChild(jing_helper.elt("h2","Cohorts"));

			cohortListPage(_.intersection(activeHosts, userHosts), mainNode);
	        container.appendChild(mainNode);
			document.body.appendChild(container);
		}
});
