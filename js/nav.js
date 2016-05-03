/*global require: false, document: false, window: false */
'use strict';

require('bootstrap/dist/css/bootstrap.css');

var React = require('react');
var ReactDOM = require('react-dom');
var Nav = require('react-bootstrap/lib/Nav');
var Navbar = require('react-bootstrap/lib/Navbar');
var NavItem = require('react-bootstrap/lib/NavItem');
var _ = require('./underscore_ext');
var config = require('./config');

// XXX use baseurl
//var baseurl = require('config').baseurl;


var links = [
	{href: "http://xena.ucsc.edu", label: "Home"},
	{href: "../datapages/", label: "Explore Data"},
	{href: "../heatmap/", label: "Visualization"},
	{href: "../hub/", label: "Data Hubs"},
	{href: "https://galaxyxena.soe.ucsc.edu", label: "Galaxy Xena"},
	{href: "https://genome-cancer.ucsc.edu/download/public/get-xena/index.html", label: "Local Xena"},
	{href: "https://docs.google.com/a/soe.ucsc.edu/document/d/1CIWj6L8LAaHFmLek3yrbrjFKRm_l3Sy73lJ4wY-WM8Y", label: "Help"}
];

var XenaNav = React.createClass({
	getInitialState: function() {
		let path = window.location.pathname.slice(config.baseurl.length - 1),
			defaultLink = links[2],
			activeLink = path === "/" ? defaultLink : (_.find(links, l => l.href.includes(path)) || defaultLink);
		return {activeTab: activeLink.label};
	},

	render: function () {
		return (
			<Navbar>
				<Nav>
					{_.map(links, l => <NavItem key={l.href} href={l.href}>{l.label}</NavItem>)}
				</Nav>
			</Navbar>
		);
	}
});

var nav = document.getElementById('navMenuMain');

ReactDOM.render(<XenaNav />, nav);
