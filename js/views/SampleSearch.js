'use strict';

import PureComponent from '../PureComponent';
var React = require('react');
import Input from 'react-toolbox/lib/input';
import {IconMenu, MenuItem} from 'react-toolbox/lib/menu';
var classNames = require('classnames');
var Rx = require('../rx');

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

function countChar(str, c, max) {
	var count = 0;
	for (var i = 0; i < max; ++i) {
		if (str[i] === c) {
			count += 1;
		}
	}
	return count;
}

class SampleSearch extends PureComponent {
	state = {value: this.props.value};

	componentDidMount() {
		var highlight = new Rx.Subject();
		this.highlight = highlight.next.bind(highlight);
		this.sub = highlight.startWith(undefined).distinctUntilChanged()
			.subscribe(hl => this.props.onHighlightSelect(hl));
	}

	componentWillUnmount() {
		this.sub.unsubscribe();
	}

	componentWillReceiveProps(newProps) {
		if (this.state.value === this.props.value) {
			this.setState({value: newProps.value});
		}
		// otherwise we have buffered changes to state, and
		// updating from props would revert the user input
		// and move the carat to the end.
	}

	onChange = (value) => {
		var {onChange} = this.props;
		this.setState({value});
		onChange(value);
	};

	onSamplesSubmit = (value) => {
		var {onChange} = this.props;
		this.setState({value});
		onChange(value);
	};

	setRef = ref => {
		this.input = ref && ref.inputNode;
	}

	onCaret = () => {
		var hl = this.input ?
			countChar(this.state.value, ';', this.input.selectionStart) :
			undefined;
		this.highlight(hl);
	}

	onHideCaret = () => {
		this.highlight(undefined);
	}

	render() {
		var {matches, sampleCount, onFilter, onZoom, onCreateColumn, onResetSampleFilter, mode} = this.props,
			{value} = this.state,
			disableActions = !(matches > 0 && matches < sampleCount),
			noshow = (mode !== "heatmap");
		return (
			<div className={compStyles.SampleSearch}>
				<Input className={compStyles.inputContainer}
					onKeyUp={this.onCaret}
					onClick={this.onCaret}
					onFocus={this.onCaret}
					onBlur={this.onHideCaret}
					innerRef={this.setRef}
					spellCheck={false}
					type='text'
					value={value || ''}
					title={value}
					placeholder='Find samples e.g. TCGA-DB-A4XH, missense'
					onChange={this.onChange}
					disabled={noshow}>
				<span className={compStyles.subtitle}>{`${matches} matching samples`}</span>
				</Input>
				{noshow ? <i className={classNames('material-icons', compStyles.menuDisabled)}>filter_list</i> :
				<IconMenu title='Filter actions' className={compStyles.filterMenu} icon='filter_list' iconRipple={false} position='topLeft'>
					<MenuItem disabled={disableActions} caption='Filter' onClick={onFilter}/>
					<MenuItem caption='Clear Filter' onClick={onResetSampleFilter}/>
					<MenuItem disabled={disableActions} caption='Zoom' onClick={onZoom}/>
					<MenuItem disabled={disableActions} caption='New Column' onClick={onCreateColumn}/>
				</IconMenu>}
			</div>
		);
	}
}

module.exports = { SampleSearch };
