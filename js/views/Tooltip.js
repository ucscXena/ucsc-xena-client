'use strict';

var React = require('react');
var _ = require('../underscore_ext');
var {deepPureRenderMixin} = require('../react-utils');
var meta = require('../meta');
var classNames = require('classnames');

// Styles
var compStyles = require('./Tooltip.module.css');

var element = {
	value: (i, v) => <span key={i}>{v}</span>,
	label: (i, l) => <span key={i}>{l}</span>,
	labelValue: (i, l, v) => (
		<span key={i}>{l}: {v}</span>
	),
	url: (i, text, url) =>  (
		<span key={i}><a href={url} target='_blank'>{text}</a></span>
	)
};

function overlay() {
	return <div className={compStyles.overlay}/>;
}

var Tooltip = React.createClass({
	mixins: [deepPureRenderMixin], // XXX any reason to use deep vs. shallow?
	render: function () {
		var {data, open, onClick, onClose, frozen} = this.props,
			rows = _.getIn(data, ['rows']),
			sampleID = _.getIn(data, ['sampleID']);
		var rowsOut = _.map(rows, (row, i) => (
			<li key={i}>
				{row.map(([type, ...args], i) => element[type](i, ...args))}
			</li>
		));
		var closeIcon = frozen ? <i className='material-icons' onClick={onClose}>close</i> : null;
		var sample = sampleID ? <span>{sampleID}</span> : null;
		/*global document: false */
		return (
			<div onClick={onClick} style={{position: 'relative'}}>
				{frozen ?  overlay(onClick) : null}
				<div className={classNames(compStyles.Tooltip, {[compStyles.open]: open})}>
					<ul className={compStyles.content}>
						<li className={compStyles.title}>{sample}{closeIcon}</li>
						{rowsOut}
					</ul>
					<div className={compStyles.actions}>
						<span className={compStyles.zoomHint}>{`${meta.name}-click to ${frozen ? "unfreeze" : "freeze"}`}</span>
						<a href="http://xena.ucsc.edu/spreadsheet-zoom/" target="_blank"><i className='material-icons'>help</i></a>
					</div>
				</div>
			</div>
		);
	}
});

module.exports = Tooltip;
