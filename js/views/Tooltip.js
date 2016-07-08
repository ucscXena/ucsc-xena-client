/*globals require: false, module: false */

'use strict';

var React = require('react');
var _ = require('../underscore_ext');
var {deepPureRenderMixin} = require('../react-utils');
var meta = require('../meta');
require('./Tooltip.css');

var sampleLayout = id => (
		<tr>
			<td className='sampleID'>{id}</td>
		</tr>);

var element = {
	value: (i, v) => <td key={i}><span className='tupleValue'>{v}</span></td>,
	label: (i, l) => <td key={i}>{l}</td>,
	labelValue: (i, l, v) => (
		<td key={i}>{l}: <span className='tupleValue'>{v}</span></td>
	),
	url: (i, text, url) =>  (
		<td key={i} className='urlValue'><a href={url} target='_BLANK'>{text}</a></td>
	)
};

var styles = {
	overlay: () => ({
		zIndex: 998,
		position: 'fixed',
		top: 0,
		left: 0,
		width: document.body.clientWidth,
		height: document.body.clientHeight,
		backgroundColor: 'transparent'
	})
};

function overlay() {
	return <div style={styles.overlay()}/>;
}

var Tooltip = React.createClass({
	mixins: [deepPureRenderMixin], // XXX any reason to use deep vs. shallow?
	render: function () {
		var {data, open, onClick, frozen} = this.props,
			rows = _.getIn(data, ['rows']),
			sampleID = _.getIn(data, ['sampleID']);

		var rowsOut = _.map(rows, (row, i) => (
			<tr key={i}>
				{row.map(([type, ...args], i) => element[type](i, ...args))}
			</tr>
		));
		var sample = sampleID ? sampleLayout(sampleID) : null;
		var display = open ? 'block' : 'none';
		// className 'tooltip' aliases with bootstrap css.
		/*global document: false */
		return (
			<div onClick={onClick} style={{position: 'relative'}}>
				{frozen ?  overlay(onClick) : null}
				<div className='Tooltip' style={{zIndex: 999, display: display}}>
					<table>
						<colgroup>
							<col className='valueCol'/>
							<col className='closeCol'/>
						</colgroup>
						<tbody>
							{sample}
							{rowsOut}
							<tr style={{fontSize: "80%"}}>
								<td className='tooltipPrompt'>{`${meta.name}-click to ${frozen ? "unfreeze" : "freeze"}`}</td>
							</tr>
							<tr style={{fontSize: "80%"}}>
								<td className='tooltipPrompt'>click to zoom</td>
							</tr>
							<tr style={{fontSize: "80%"}}>
								<td className='tooltipPrompt'>shift-click to zoom out</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		);
	}
});

module.exports = Tooltip;
