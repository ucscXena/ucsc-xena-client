'use strict';

var React = require('react');
var {deepPureRenderMixin} = require('../react-utils');
var _ = require('../underscore_ext');
import Input from 'react-toolbox/lib/input';
import {IconMenu, MenuItem} from 'react-toolbox/lib/menu';
var classNames = require('classnames');

// Styles
var compStyles = require('./SampleSearch.module.css');

var SampleSearch = React.createClass({
	mixins: [deepPureRenderMixin],
	componentWillReceiveProps: function (newProps) {
		if (this.state.value === this.props.value) {
			this.setState({value: newProps.value});
		}
		// otherwise we have buffered changes to state, and
		// updating from props would revert the user input
		// and move the carat to the end.
	},
	getInitialState: function () {
		return {value: this.props.value};
	},
	onChange: function (value) {
		var {onChange} = this.props;
		this.setState({value});
		onChange(value);
	},
	onResetSampleFilter: function () {
		this.props.callback(['sampleFilter', 0 /* index into composite cohorts */, null]);
	},
	render: function () {
		var {onFilter, onZoom, onCreateColumn, mode, cohort} = this.props,
			{value} = this.state,
			noshow = (mode !== "heatmap"),
			sampleFilter = _.getIn(cohort, [0, 'sampleFilter']),
			filterDisabled = (noshow || !value);
		return (
			<div className={compStyles.SampleSearch}>
				<Input className={compStyles.inputContainer}
					type='text'
					value={value}
					title={value}
					placeholder='Find samples e.g. TCGA-DB-A4XH, missense'
					onChange={this.onChange}
					disabled={noshow}/>
				{filterDisabled ? <i className={classNames('material-icons', compStyles.menuDisabled)}>filter_list</i> :
				<IconMenu className={compStyles.filterMenu} icon='filter_list' iconRipple={false} position='topLeft'>
					{sampleFilter ? <MenuItem caption='Clear Filter' onClick={this.onResetSampleFilter}/> :
						<MenuItem caption='Filter' onClick={onFilter}/>}
					<MenuItem caption='Zoom' onClick={onZoom}/>
					<MenuItem caption='New Column' onClick={onCreateColumn}/>
				</IconMenu>}
			</div>
		);
	}
});

module.exports = SampleSearch;
