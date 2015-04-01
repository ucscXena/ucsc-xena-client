/*global require: false, document: false */
'use strict';
var dh = require('dom_helper');
//var baseurl = config.get('baseurl');
var links = [
	{href: "http://xena.ucsc.edu", label: "Home"},
	{href: "../datapages/", label: "Explore Data"},
	{href: "../heatmap/", label: "Visualization"},
	{href: "../hub/", label: "Data Hubs"},
  {href: "https://galaxyxena.soe.ucsc.edu", label: "Galaxy Xena"},
	{href: "https://genome-cancer.ucsc.edu/download/public/get-xena/index.html", label: "Local Xena"},
	{href:"https://docs.google.com/a/soe.ucsc.edu/document/d/1CIWj6L8LAaHFmLek3yrbrjFKRm_l3Sy73lJ4wY-WM8Y", label: "Help"}
];
var nav = document.getElementById('navMenuMain');

links.forEach(function (link) {
	dh.append(nav, dh.stringToDOM('<a class="menu" href="' +
							 link.href +
							 '">' + link.label + '</a>'));
});
