/*jslint browser: true,  nomen: true*/
/*global define: false */

define(["dom_helper", "data", "xenaQuery"], function (dom_helper, data, xenaQuery) {
	'use strict';

	function newHubNode(host) {
		//build checkbox
		var checkbox = data.hostCheckBox(host),
			tmpNode = dom_helper.elt("result2", dom_helper.hrefLink(host + " (connecting)", "index.html?host=" + host));
		tmpNode.setAttribute("id", "status" + host);
		return dom_helper.elt("h3", checkbox, " ", tmpNode);
	}

	data.sessionStorageInitialize();
	var hosts = JSON.parse(sessionStorage.state).allHosts,
		node = dom_helper.sectionNode("hub"),
		newText;

	node.appendChild(dom_helper.elt("h2", "Data Hubs"));
	node.appendChild(dom_helper.elt("br"));
	hosts.forEach(function (host) {
		node.appendChild(newHubNode(host));
		node.appendChild(dom_helper.elt("br"));
		data.updateHostStatus(host);
	});

	newText = document.createElement("INPUT");
	newText.setAttribute("class", "tb5");
	newText.setAttribute("id", "textHub");
	node.appendChild(dom_helper.elt("italic", "Add  "));
	node.appendChild(newText);
	document.body.appendChild(node);

	window.addEventListener("keydown", function (event) {
		if (event.keyCode === 13) {
			var node = document.getElementById("textHub"),
				host = node.value;
			host = host.trim();
			//if host is not start with http(s)
			if (host === "") {
				return;
			}

			host = xenaQuery.server_url(host);

			/*
			   if (( host.search("http") !== 0) || ( host.search("://")===-1 ))
			   {
			   host="http://"+host;
			   }
			   */

			if (hosts.indexOf(host) !== -1) {
				node.value = "";
				return;
			}
			node.parentNode.insertBefore(newHubNode(host), node.previousSibling);
			node.parentNode.insertBefore(dom_helper.elt("br"), node.previousSibling);
			hosts.push(host);
			node.value = "";
			data.updateHostStatus(host);
		}
	});
});
