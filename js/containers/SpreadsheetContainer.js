/*global module: false, require: false */
'use strict';

var React = require('react');
var _ = require('../underscore_ext');
var Spreadsheet = require('../Spreadsheet');
var {rxEventsMixin} = require('../react-utils');

function zoomIn(pos, samples, zoom) {
	var {count, index} = zoom;
	var nCount = Math.max(1, Math.round(count / 3)),
		maxIndex = samples - nCount,
		nIndex = Math.max(0, Math.min(Math.round(index + pos * count - nCount / 2), maxIndex));

	return _.merge(zoom, {count: nCount, index: nIndex});
}

function zoomOut(samples, zoom) {
	var {count, index} = zoom;
	var nCount = Math.min(samples, Math.round(count * 3)),
		maxIndex = samples - nCount,
		nIndex = Math.max(0, Math.min(Math.round(index + (count - nCount) / 2), maxIndex));

	return _.merge(zoom, {count: nCount, index: nIndex});
}

function targetPos(ev) {
	var bb = ev.currentTarget.getBoundingClientRect();
	return (ev.clientY - bb.top) / ev.currentTarget.clientHeight;
}

var zoomInClick = ev => !ev.altKey && !ev.ctrlKey && !ev.metaKey && !ev.shiftKey;
var zoomOutClick = ev => !ev.altKey && !ev.ctrlKey && !ev.metaKey && ev.shiftKey;

// XXX Does this break hot-loading? Yes. Can we manually shim
// it, as when exporting multiple components?
var getSpreadsheetContainer = Column => React.createClass({
	mixins: [rxEventsMixin],
	componentWillMount() {
		this.events('plotClick');

		this.plotClick = this.ev.plotClick.subscribe(ev => {
			let {callback, appState: {zoom, samples}} = this.props;
			if (zoomOutClick(ev)) {
				callback(['zoom', zoomOut(samples.length, zoom)]);
			} else if (zoomInClick(ev)) {
				callback(['zoom', zoomIn(targetPos(ev), samples.length, zoom)]);
			}
		});
	},
	componentWillUnmount() { // XXX refactor into a takeUntil mixin?
		this.plotClick.dispose();
	},
	render() {
		return <Spreadsheet {...this.props} onPlotClick={this.ev.plotClick} Column={Column}/>;
	}
});

module.exports = {getSpreadsheetContainer};
