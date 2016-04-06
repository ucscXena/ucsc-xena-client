/*global require: false, document: false */
'use strict';

require('bootstrap/dist/css/bootstrap.css');

var React = require('react');
var ReactDOM = require('react-dom');
var {Nav, Navbar, NavItem} = require('react-bootstrap/lib');
var _ = require('./underscore_ext');

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
		let currentPath = window.location.pathname,
			activeLink = _.find(links, l => l.href.includes(currentPath)) || links[2];
		return {activeTab: activeLink.label};
	},
	componentWillUnmount: function() {
		console.log("Nav is unmounting...");
	},
	render: function() {
		let {activeTab} = this.state;
		return (
			<Navbar>
				<Nav activeKey={activeTab} bsStyle="pills">{_.map(links, l =>
					<NavItem key={l.href} eventKey={l.label} href={l.href}>{l.label}</NavItem>
				)}
				</Nav>
			</Navbar>
		);
	}
});

var nav = document.getElementById('navMenuMain');

ReactDOM.render(<XenaNav />, nav);
