/*jslint browser: true,  nomen: true*/
/*global define: false */

define(["dom_helper", "session", "xenaQuery", "base", "../css/datapages.css"], function (dom_helper, session, xenaQuery) {
	'use strict';

	function newHubNode(host) {
		//build checkbox
		var checkbox = session.hostCheckBox(host),
			 	tmpNode = dom_helper.elt("result2",
			 		dom_helper.hrefLink(host + " (connecting)", "../datapages/?host=" + host));
		tmpNode.setAttribute("id", "statusHub" + host);
		checkbox.appendChild(tmpNode);
		return dom_helper.elt("h4", checkbox);
	}

	function addHost() {
		var node = document.getElementById("textHub"),

		host = node.value;
		host = host.trim();
		//if host is not start with http(s)
		if (host === "") {
			return;
		}

		// get ride of ending '/''
		if (host[host.length-1]==='/') {
			host = host.slice(0, host.length-1);
		}
		// specially code for galaxyxena.soe.ucsc.edu
		if (host.match(/galaxyxena.*.ucsc.edu/gi))
		{
			host = "https://galaxyxena.soe.ucsc.edu:443/xena";
		}
		// if galaxy checkbox checked, force prot to 7220
		if (galaxyCheckbox.checked) {
			var tokens = host.match(/^(https?:\/\/)?([^:\/]+)(:([0-9]+))?(\/(.*))?$/);
			tokens[4] = '7220';  //port = tokens[4];
			host =(tokens[1]? tokens[1]:'') +(tokens[2]? tokens[2]:'')+':'+tokens[4]+ (tokens[5]? tokens[5]:'');
		}

		host = xenaQuery.server_url(host);

		if (hosts.indexOf(host) !== -1) {
			node.value = "";
			return;
		}

		node.parentNode.insertBefore(newHubNode(host), node.previousSibling);
		node.parentNode.insertBefore(dom_helper.elt("br"), node.previousSibling);
		hosts.push(host);
		node.value = "";
		galaxyCheckbox.checked = false;
		session.updateHostStatus(host);
	}


	session.sessionStorageInitialize();
	var hosts = JSON.parse(sessionStorage.state).allHosts,
			node = dom_helper.sectionNode("hub"),
			newText, addbutton,
			galaxyCheckbox, labelText;

	node.appendChild(dom_helper.elt("h2", "Data Hubs"));
	node.appendChild(dom_helper.elt("br"));

	//list of hosts
	hosts.forEach(function (host) {
		node.appendChild(newHubNode(host));
		node.appendChild(dom_helper.elt("br"));
		session.updateHostStatus(host);
		});

	// Add host text box
	node.appendChild(dom_helper.sectionNode("hub"));
	newText = document.createElement("INPUT");
	newText.setAttribute("class", "tb5");
	newText.setAttribute("id", "textHub");
	node.appendChild(newText);

	// Add button
	addbutton = document.createElement("BUTTON");
	addbutton.setAttribute("class","vizbutton");
	addbutton.appendChild(document.createTextNode("Add"));
	addbutton.addEventListener("click", function() {
  	addHost();
	});
	addbutton.style.marginLeft="20px";
	addbutton.style.height ="27px";
	node.appendChild(addbutton);
	node.appendChild(dom_helper.elt("br"));

	//galaxy xena checkbox -- if checked port forced to be 7220
	galaxyCheckbox = document.createElement("INPUT");
	galaxyCheckbox.setAttribute("type", "checkbox");
	galaxyCheckbox.setAttribute("id", "galaxyCheckbox");
	galaxyCheckbox.style.marginLeft="2px";
	labelText = dom_helper.elt('label');
	labelText.setAttribute("for", "galaxyCheckbox");
	labelText.innerHTML= " galaxy embedded xena (default port 7220)";
	labelText.setAttribute("class","galaxyText");
	node.appendChild(galaxyCheckbox);
	node.appendChild(labelText);

	document.getElementById('main').appendChild(node);

	newText.onkeydown= function (event) {
		if (event.keyCode === 13) {
			addHost();
		}
	};
});
