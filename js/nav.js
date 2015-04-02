/*global require: false, document: false */
'use strict';

require('bootstrap/dist/css/bootstrap.css');

var React = require('react');
var Nav = require('react-bootstrap/lib/Nav');
var Navbar = require('react-bootstrap/lib/Navbar');
var NavItem = require('react-bootstrap/lib/NavItem');
var _ = require('underscore_ext');

// XXX use baseurl
//var baseurl = require('config').baseurl;


var links = [
	{href: "http://xena.ucsc.edu", label: "Home"},
	{href: "../datapages/", label: "Explore Data"},
	{href: "../heatmap/", label: "Visualization"},
	{href: "../hub/", label: "Data Hubs"},
	{href: "https://genome-cancer.ucsc.edu/download/public/get-xena/index.html", label: "Local Xena"},
	{href:"https://docs.google.com/a/soe.ucsc.edu/document/d/1CIWj6L8LAaHFmLek3yrbrjFKRm_l3Sy73lJ4wY-WM8Y", label: "Help"}
];

var XenaNav = React.createClass({
	render: function () {
		return (
			<Navbar>
				<Nav>
					{_.map(links, l => <NavItem href={l.href}>{l.label}</NavItem>)}
				</Nav>
			</Navbar>
		);
	}
});

var nav = document.getElementById('navMenuMain');

React.render(<XenaNav />, nav);
