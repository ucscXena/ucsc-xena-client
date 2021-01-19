import PureComponent from '../PureComponent';
var React = require('react');
import Input from 'react-toolbox/lib/input';
import {IconMenu, Menu, MenuItem} from 'react-toolbox/lib/menu';
import {IconButton} from 'react-toolbox/lib/button';
var classNames = require('classnames');
var Rx = require('../rx').default;
import Tooltip from 'react-toolbox/lib/tooltip';
import {createVignette} from '../containers/vignette';
import HelpBox from '../views/HelpBox';

var TooltipInput = Tooltip(({inputRef, ...props}) =>
		<Input innerRef={inputRef} {...props}/>);
var TooltipI = Tooltip('i');
var TooltipIconButton = Tooltip(IconButton);

// The Tooltip component will get mouse enter/leave events on menu children,
// causing the tooltip to display in front of the menu when it is open. There's
// no way to disable the Tooltip while the menu is open. This is a workaround
// that intercepts the onMouseEnter method that is injected by the Tooltip
// component, and filters events based on the event target type.
class IconMenuWrapper extends PureComponent {
	onMouseEnter = ev => {
		if (ev.target.type === 'button') {
			this.props.onMouseEnter(ev);
		}
	}
	render() {
		var {onMouseEnter, ...props} = this.props; //eslint-disable-line no-unused-vars
		return <IconMenu onMouseEnter={this.onMouseEnter} {...props}/>;
	}
}


var TooltipIconMenu = Tooltip(IconMenuWrapper);


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

function findSubExpr(offsets, i) {
	var j = 0;
	while (i > offsets[j]) {
		++j;
	}
	return j;
}
var tooltips = {
	filter: 'Filter samples',
	subgroup: 'Create sample subgroups from data on the screen',
	find: 'Highlight or zoom in on a selection of samples',
	clear: 'Clear current filter and show all samples in the study',
	input: 'Examples: "null","B:>5 OR B:<2"',
	keep: 'Keep only the selected samples on the screen',
	remove: 'Remove the selected samples from the screen',
	makeSubgroup: 'Matched samples will be one subgroup and non-matched samples will be the other subgroup',
	highlight: 'Highlight selected samples',
	zoom: 'Zoom in to selected samples',
	history: 'Previous search text'
};

var placeholder = {
	true: 'Click on a column or type here to select samples',
	false: 'Type here or use dropper to select samples'
};

var input = comp => {
	var {matches, mode, history, pickSamples} = comp.props,
		{value} = comp.state,
		hasHistory = history.length > 0,
		noshow = (mode !== "heatmap");

	return (<TooltipInput key='input'
			className={classNames(compStyles.inputContainer, pickSamples && compStyles.picking)}
			tooltip={tooltips.input}
			onKeyUp={comp.onCaret}
			onClick={comp.onCaret}
			onFocus={comp.onCaret}
			onBlur={comp.onHideCaret}
			inputRef={comp.setRef}
			spellCheck={false}
			type='text'
			value={value || ''}
			placeholder={placeholder[pickSamples]}
			onChange={comp.onChange}
			disabled={noshow}>
		<TooltipI tooltip={tooltips.history} onClick={hasHistory && !noshow ? comp.onOpenHistory : null}
				className={classNames(compStyles.dropDownArrow,
					!noshow && hasHistory && compStyles.hasHistory, 'material-icons')}>
				arrow_drop_down</TooltipI>

		<Menu theme={{static: compStyles.history, active: compStyles.historyActive}}
				onShow={comp.onShowHistory} onHide={comp.onHideHistory}
				position='static' active={comp.state.historyOpen}>
			{history.map((b, i) =>
					// Note that Menu onSelect is broken in dev because of component
					// identity comparisons, and MenuItem events are broken in prod
					// because of RT deferring callbacks with a setState call, thus
					// allowing currentTarget to be nulled, so our only option here
					// is to create closures on every render. Very annoying.
					<MenuItem className={compStyles.menuItem} onClick={() => comp.onHistory(b)}
						data-value={b} key={i} value={b} caption={b}/>)}
		</Menu>
		<span className={compStyles.subtitle}>{`${matches} matching samples`}</span>
	</TooltipInput>);
};

const searchHelp = 'https://ucsc-xena.gitbook.io/project/overview-of-features/filter-and-subgrouping';

var helpSteps = [
	'pickHelp',
	props => (
		<HelpBox o='Below' w={400} onClose={props.onClose}>
			<h3>Filtering and subgrouping</h3>
			<p>Click to enter dropper mode, then click or drag on a column to select samples.</p>
		</HelpBox>),
	'inputHelp',
	props => (
		<HelpBox o='Below' w={400} onClose={props.onClose}>
			<p>As you select samples, the expression will update with your selection.</p>
			<p>You can also type a search expression here.</p>
		</HelpBox>),
	'actionHelp',
	props => (
		<HelpBox o='Below' w={400} onClose={props.onClose}>
			<p>When you have added all your samples, use the menu to filter or create subgroups from your selection.</p>
			<a href={searchHelp} target='_blank'>Filter/subgroup documentation</a>
		</HelpBox>)
];

class Search extends PureComponent {
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

	componentDidUpdate() {
		var oldSearch = this.props.oldSearch;
		// oldSearch will update before value, so we have to check for both.
		if (oldSearch != null && this.props.value) {
			// We have to set focus for the selection to be visible. If this
			// is problematic, we'll need to implement our own selection highlight
			// until the element has focus.
			this.input.focus({preventScroll: true});
			this.input.setSelectionRange(oldSearch.length, this.props.value.length);
			this.input.scrollLeft = this.input.scrollWidth;
		}
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
		var hl = this.input && this.props.offsets ?
			findSubExpr(this.props.offsets, this.input.selectionStart) :
			undefined;
		this.highlight(hl);
	}

	onHideCaret = () => {
		this.highlight(undefined);
	}

	onOpenHistory = () => {
		this.setState({historyOpen: !this.state.historyOpen});
	}

	onHistory = value => {
		this.setState({historyOpen: false});
		this.props.onHistory(value); // move to front of history
		this.props.onChange(value);
	}

	// These two are hacks to keep local state synced with the menu, e.g.
	// when the user closes it by clicking outside the menu.
	onShowHistory = () => {
		this.setState({historyOpen: true});
	}

	onHideHistory = () => {
		this.setState({historyOpen: false});
	}

	onRemove = () => {
		this.props.onHistory(this.state.value.trim());
		this.props.onFilter(true);
	}

	onKeep = () => {
		this.props.onHistory(this.state.value.trim());
		this.props.onFilter(false);
	}

	onCreateColumn = () => {
		// have to add to history before the columns reorder, to
		// prevent the history having wrong column ids.
		this.props.onHistory(this.state.value.trim());
		this.props.onCreateColumn();
	}

	onZoom = () => {
		this.props.onHistory(this.state.value.trim());
		this.props.onZoom();
	}

	render() {
		var {matches, sampleCount, sampleFilter, mode, pickSamples, onPickSamples, onResetSampleFilter} = this.props,
			{inputHelp, pickHelp, actionHelp} = this.props,
			disableActions = !(matches > 0 && matches < sampleCount),
			noshow = (mode !== "heatmap");

		return (
			<div className={compStyles.SampleSearch}>
				{inputHelp(input(this))}
				{pickHelp(
					<TooltipIconButton icon='colorize' className={pickSamples ? compStyles.dark : ''}
						disabled={noshow} onClick={onPickSamples} tooltip='Pick samples'/>)}
				{noshow ? <i className={classNames('material-icons', compStyles.menuDisabled)}>filter_list</i> :
				actionHelp(
					<TooltipIconMenu tooltip='Filter + subgroup actions' className={compStyles.filterMenu} icon='filter_list' iconRipple={false} position='topLeft'>
						<MenuItem disabled={disableActions} caption='Keep samples' onClick={this.onKeep}/>
						<MenuItem disabled={disableActions} caption='Remove samples' onClick={this.onRemove}/>
						<MenuItem disabled={!sampleFilter} caption='Clear samples filter' onClick={onResetSampleFilter}/>
						<MenuItem disabled={disableActions} caption='Zoom' onClick={this.onZoom}/>
						<MenuItem disabled={disableActions} caption='New subgroup column' onClick={this.onCreateColumn}/>
					</TooltipIconMenu>)}
				<IconButton icon='help_outline' disabled={noshow}
					onClick={this.props.help.start}/>
			</div>
		);
	}
}

export var SampleSearch = createVignette(helpSteps, Search);
