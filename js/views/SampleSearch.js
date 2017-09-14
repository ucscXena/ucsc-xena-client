'use strict';

var _ = require('../underscore_ext');
var React = require('react');
var {deepPureRenderMixin} = require('../react-utils');
var _ = require('../underscore_ext');
import Input from 'react-toolbox/lib/input';
import {IconMenu, MenuItem} from 'react-toolbox/lib/menu';
var classNames = require('classnames');

// Styles
var compStyles = require('./SampleSearch.module.css');

//var SampleIDInput = React.createClass({
//	getInitialState() {
//		return {
//			show: false,
//			value: undefined
//		};
//	},
//	onChange (ev) {
//		var value = ev.target.value;
//		this.setState({value});
//	},
//	close () {
//		this.setState({ show: false});
//	},
//	submit () {
//		var samplesList = this.state.value.split(/\s+/),
//			{onSearchIDAndFilterColumn, onSamplesSubmit} = this.props;
//		this.close();
//		this.state.value = '';
//		onSearchIDAndFilterColumn(samplesList);
//		onSamplesSubmit("A:true"); // since the new column is always column A
//	},
//	render() {
//		var tooltipButton = <Tooltip>Search by sample IDs</Tooltip>,
//			tooltipModalString = 'Samples match your list will be highlighted. \
//				A new binary column will be made using your list: matched samples vs. the rest.',
//			tooltipModal = <Tooltip>{tooltipModalString}</Tooltip>,
//			{cohortSamples, disabled} = this.props,
//			help = 'e.g.\n' + Object.values(cohortSamples)[0].slice(0, 5).join('\n') + '\n...';
//
//		return (
//			<span className = "modal-container" >
//				<OverlayTrigger trigger={['hover']} placement="top" overlay={tooltipButton}>
//					<Button
//						bsSize = "small"
//						onClick = {() => this.setState({ show: true})}
//						disabled={disabled}>
//						Custom Sample List
//					</Button>
//				</OverlayTrigger>
//				<Modal
//					show={this.state.show}
//					onHide={this.close}
//					container={this}
//					aria-labelledby="contained-modal-title">
//					<Modal.Header closeButton>
//						<Modal.Title id="contained-modal-title">
//							Enter a list of samaple IDs to highlight
//							<OverlayTrigger trigger={['hover']} placement="right" overlay={tooltipModal}>
//								<span className='glyphicon glyphicon-info-sign text-muted'
//									style={{margin: '5px'}}/>
//							</OverlayTrigger>
//						</Modal.Title>
//					</Modal.Header>
//					<Modal.Body>
//						<Input style={{width: 550, height: 200}}
//							value={this.state.value}
//							type ="textarea"
//							placeholder={help}
//							onChange={this.onChange}/>
//					</Modal.Body>
//					<Modal.Footer>
//						<Button bsStyle="primary" onClick={this.submit} disabled={!this.state.value}>Submit</Button>
//						<Button onClick={this.close}>Cancel</Button>
//					</Modal.Footer>
//				</Modal>
//			</span>
//		);
//	}
//});

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
	onSamplesSubmit: function (value) {
		var {onChange} = this.props;
		this.setState({value});
		onChange(value);
	},
	render: function () {
		var {matches, onFilter, onZoom, onCreateColumn, mode, cohort} = this.props,
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
					disabled={noshow}>
				<span className={compStyles.subtitle}>{`${matches} matching samples`}</span>
				</Input>
				{filterDisabled ? <i className={classNames('material-icons', compStyles.menuDisabled)}>filter_list</i> :
				<IconMenu title='Filter actions' className={compStyles.filterMenu} icon='filter_list' iconRipple={false} position='topLeft'>
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
