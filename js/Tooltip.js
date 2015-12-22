/*globals require: false, module: false */

'use strict';

var React = require('react');
var _ = require('./underscore_ext');
var PureRenderMixin = require('react/addons').addons.PureRenderMixin;
var meta = require('./meta');
require('../css/tooltip.css');

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

var Tooltip = React.createClass({
	mixins: [PureRenderMixin],
	render: function () {
		var {data, open, frozen} = this.props,
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
		return (
			<div className='Tooltip' style={{display: display}}>
				<table>
					<colgroup>
						<col className='valueCol'/>
						<col className='closeCol'/>
					</colgroup>
					<tbody>
						{sample}
						{rowsOut}
						<tr>
							<td className='tooltipPrompt'>{`${meta.name}-click to ${frozen ? "unfreeze" : "freeze"}`}</td>
						</tr>
					</tbody>
				</table>
			</div>
		);
	}
});

module.exports = Tooltip;
