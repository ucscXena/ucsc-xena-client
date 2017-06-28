'use strict';

var _ = require('../underscore_ext');
var React = require('react');
var Input = require('react-bootstrap/lib/Input');
var Button = require('react-bootstrap/lib/Button');
var SplitButton = require('react-bootstrap/lib/SplitButton');
var MenuItem = require('react-bootstrap/lib/MenuItem');
var Tooltip = require('react-bootstrap/lib/Tooltip');
var OverlayTrigger = require('react-bootstrap/lib/OverlayTrigger');
var Modal = require('react-bootstrap/lib/Modal');
var {deepPureRenderMixin} = require('../react-utils');

var SampleIDInput = React.createClass({
	getInitialState() {
		return {
			show: false,
			value: undefined
		};
	},
	onChange (ev) {
		var value = ev.target.value;
		this.setState({value});
	},
	close () {
		this.setState({ show: false});
	},
	submit () {
		var samplesList = this.state.value.split(/\s+/),
			{onSearchIDAndFilterColumn, onSamplesSubmit} = this.props;
		this.close();
		this.state.value = '';
		onSearchIDAndFilterColumn(samplesList);
		onSamplesSubmit("A:true"); // since the new column is always column A
	},
	render() {
		var tooltipButton = <Tooltip>Search by sample IDs</Tooltip>,
			tooltipModalString = 'New binary column will be made using your list: \
				matched samples vs. the rest.',
			tooltipModal = <Tooltip>{tooltipModalString}</Tooltip>,
			{cohortSamples, disabled} = this.props,
			help = 'e.g.\n' + Object.values(cohortSamples)[0].slice(0, 5).join('\n') + '\n...';

		return (
			<span className = "modal-container" >
				<OverlayTrigger trigger={['hover']} placement="top" overlay={tooltipButton}>
					<Button
						bsSize = "small"
						onClick = {() => this.setState({ show: true})}
						disabled={disabled}>
						Custom Sample List
					</Button>
				</OverlayTrigger>
				<Modal
					show={this.state.show}
					onHide={this.close}
					container={this}
					aria-labelledby="contained-modal-title">
					<Modal.Header closeButton>
						<Modal.Title id="contained-modal-title">
							Enter a list of samaple IDs to highlight
							<OverlayTrigger trigger={['hover']} placement="right" overlay={tooltipModal}>
								<span
								 className='glyphicon glyphicon-info-sign'
								 aria-hidden='true'/>
							</OverlayTrigger>
						</Modal.Title>
					</Modal.Header>
					<Modal.Body>
						<Input style={{width: 550, height: 200}}
							value={this.state.value}
							type ="textarea"
							placeholder={help}
							onChange={this.onChange}/>
					</Modal.Body>
					<Modal.Footer>
						<Button bsStyle="primary" onClick={this.submit} disabled={!this.state.value}>Submit</Button>
						<Button onClick={this.close}>Cancel</Button>
					</Modal.Footer>
				</Modal>
			</span>
		);
	}
});

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
	onChange: function (ev) {
		var {onChange} = this.props,
			value = ev.target.value;
		this.setState({value});
		onChange(value);
	},
	onSamplesSubmit: function (value) {
		var {onChange} = this.props;
		this.setState({value});
		onChange(value);
	},
	render: function () {
		var {matches, help, onFilter, onZoom, onCreateColumn, onSearchIDAndFilterColumn, cohortSamples, mode} = this.props,
			{value} = this.state,
			noshow = (mode !== "heatmap"),
			filterButton = onFilter ?
					(<span
						 title='Apply as filter'
						 className='glyphicon glyphicon-filter'
						 aria-hidden='true'/>) : null;
		return (
			!_.isEmpty(cohortSamples) ?
				<form className='form-inline' onSubmit={ev => ev.preventDefault()}>
					<Input style={{width: '26em'}}
						type='text'
						value={value}
						title={value}
						placeholder={'Samples to highlight. e.g. TCGA-DB-A4XH-01, missense'}
						onChange={this.onChange}
						disabled={noshow}/>
					{` Matching samples: ${matches}`}
					{filterButton ?
						(<SplitButton onClick={onFilter} bsSize='sm' title={filterButton} disabled={noshow}>
							<MenuItem title='Apply to filter' onClick={onFilter}>Filter</MenuItem>
							<MenuItem title='Apply to zoom' onClick={onZoom}>Zoom</MenuItem>
							<MenuItem title='Create column from' onClick={onCreateColumn}>New Column</MenuItem>
						</SplitButton>) : null}
					{help ? <Button bsStyle='link' target='_blank' href={help}>Help with search</Button> : null}
					<SampleIDInput
						onSearchIDAndFilterColumn={onSearchIDAndFilterColumn}
						onSamplesSubmit={this.onSamplesSubmit}
						cohortSamples={cohortSamples}
						disabled={noshow}/>
				</form> : null
		);
	}
});

module.exports = SampleSearch;
