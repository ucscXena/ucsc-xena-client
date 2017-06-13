'use strict';

require('bootstrap/dist/css/bootstrap.css');

var React = require('react');
var ReactDOM = require('react-dom');
var Nav = require('react-bootstrap/lib/Nav');
var Navbar = require('react-bootstrap/lib/Navbar');
var NavItem = require('react-bootstrap/lib/NavItem');
var _ = require('./underscore_ext');
var config = require('./config');
import {ThemeProvider} from 'react-css-themr';
var {appTheme} = require('./appTheme');

var links = [
	{href: "http://xena.ucsc.edu", label: "Home"},
	{href: "../datapages/", label: "Data Sets"},
	{href: "../heatmap/", label: "Visualization"},
	{href: "../hub/", label: "Data Hubs"},
	//{href: "https://genome-cancer.ucsc.edu/download/public/get-xena/index.html", label: "Local Xena"},
	{href: "http://xena.ucsc.edu/private-hubs/", label: "View My Data"},
	{href: "http://xena.ucsc.edu/xena-python-api/", label: "Python"},
	{href: "https://genome-cancer.ucsc.edu/proj/site/composite/heatmap/#nostate", label: "Beta Features"},
	{href: "https://docs.google.com/a/soe.ucsc.edu/document/d/1CIWj6L8LAaHFmLek3yrbrjFKRm_l3Sy73lJ4wY-WM8Y", label: "Help"}
];

var target = l => l.target ? {target: l.target} : {};

var XenaNav = React.createClass({
	getInitialState: function() {
		let path = window.location.pathname.slice(config.baseurl.length - 1),
			defaultLink = links[2],
			activeLink = path === "/" ? defaultLink : (_.find(links, l => l.href.includes(path)) || defaultLink);
		return {activeTab: activeLink.label};
	},

	render: function () {
		let {activeTab} = this.state;
		return (
			<Navbar>
				<Nav activeKey={activeTab} bsStyle="pills">
					{_.map(links, l => <NavItem {...target(l)} key={l.href} eventKey={l.label} href={l.href}>{l.label}</NavItem>)}
				</Nav>
			</Navbar>
		);
	}
});

var ThemedNav = React.createClass({
	render() {
		return (
		<ThemeProvider theme={appTheme}>
			<XenaNav {...this.props}/>
		</ThemeProvider>);
	}
});

var nav = document.getElementById('navMenuMain');

ReactDOM.render(<ThemedNav />, nav);
