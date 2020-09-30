
import PureComponent from '../PureComponent';
var React = require('react');
import Input from 'react-toolbox/lib/input';
import {Button} from 'react-toolbox/lib/button';
var classNames = require('classnames');
var Rx = require('../rx').default;
import {Menu, MenuItem} from 'react-toolbox/lib/menu';
import Tooltip from 'react-toolbox/lib/tooltip';

var TooltipButton = Tooltip(Button);
var TooltipInput = Tooltip(({inputRef, ...props}) =>
		<Input innerRef={inputRef} {...props}/>);
var TooltipI = Tooltip('i');


// Styles
var compStyles = require('./SampleSearch.module.css');

const searchHelp = 'https://ucsc-xena.gitbook.io/project/overview-of-features/filter-and-subgrouping';

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
	input: 'Examples: "missense", "null","B:>2"',
	keep: 'Keep only the selected samples on the screen',
	remove: 'Remove the selected samples from the screen',
	makeSubgroup: 'Matched samples will be one subgroup and non-matched samples will be the other subgroup',
	highlight: 'Highlight selected samples',
	zoom: 'Zoom in to selected samples',
	history: 'Previous search text'
};

var input = comp => {
	var {matches, mode, history} = comp.props,
		{value} = comp.state,
		hasHistory = history.length > 0,
		noshow = (mode !== "heatmap");

	return <TooltipInput key='input'
			className={classNames(compStyles.inputContainer, compStyles.picking)}
			tooltip={tooltips.input}
			onKeyUp={comp.onCaret}
			onClick={comp.onCaret}
			onFocus={comp.onCaret}
			onBlur={comp.onHideCaret}
			inputRef={comp.setRef}
			spellCheck={false}
			type='text'
			value={value || ''}
			placeholder='Click on visual spreadsheet or type here to select samples'
			onChange={comp.onChange}
			disabled={noshow}>
		<TooltipI tooltip={tooltips.history} onClick={comp.onOpenHistory}
				className={classNames(compStyles.dropDownArrow,
					hasHistory && compStyles.hasHistory, 'material-icons')}>
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
	</TooltipInput>;
};

var help = <a key='help' href={searchHelp} target='_blank'
	className={compStyles.filterHelp}><i className='material-icons'>help_outline</i></a>;

var close = comp =>
	<i key='close' onClick={comp.onMode} data-mode='off' className="material-icons"
		title="Close">close</i>;

var modeButtons = {
	filter: (comp, disabled) => [
		<span key='filter' className={compStyles.label}>Filter</span>,
		input(comp),
		<TooltipButton tooltip={tooltips.keep} key='keep' disabled={disabled}
			onClick={comp.onKeep}>Keep</TooltipButton>,
		<TooltipButton tooltip={tooltips.remove} key='remove' disabled={disabled}
			onClick={comp.onRemove}>Remove</TooltipButton>,
		close(comp),
		help
	],
	subgroup: (comp, disabled) => [
		<span key='subgroup' className={compStyles.label}>Subgroup</span>,
		input(comp),
		<TooltipButton tooltip={tooltips.makeSubgroup}key='make-subgroup'
			disabled={disabled} onClick={comp.onSubgroup}>Make subgroups</TooltipButton>,
		close(comp),
		help
	],
	find: (comp, disabled) => [
		<span key='find' className={compStyles.label}>Highlight</span>,
		input(comp),
		<TooltipButton tooltip={tooltips.highlight} key='continue' disabled={disabled}
			onClick={comp.onContinue}>Highlight</TooltipButton>,
		<TooltipButton tooltip={tooltips.zoom} key='zoom' disabled={disabled}
			onClick={comp.onZoom}>Zoom</TooltipButton>,
		close(comp),
		help
	],
	off: comp => [
		<TooltipButton tooltip={tooltips.filter} key='filter' data-mode='filter'
			onClick={comp.onMode}>Filter</TooltipButton>,
		<TooltipButton tooltip={tooltips.subgroup} key='subgroup' data-mode='subgroup'
			onClick={comp.onMode}>Subgroup</TooltipButton>,
		<TooltipButton tooltip={tooltips.find} key='find' data-mode='find'
			onClick={comp.onMode}>Highlight</TooltipButton>,
		help,
		comp.props.onResetSampleFilter ?
			<TooltipButton tooltip={tooltips.clear} key='clear'
				onClick={comp.props.onResetSampleFilter}>Clear Filter</TooltipButton> :
			null
	]
};

export class SampleSearch extends PureComponent {
	state = {
		value: this.props.value,
	};

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

	setMode(searchMode, optIn) {
		var opt = Object.assign({clear: true, history: true}, optIn),
			{value} = this.state,
			{onHistory} = this.props,
			trimmed = (value || '').trim();

		if (opt.history && trimmed) {
			onHistory(trimmed);
		}
		this.setState({
			historyOpen: false
		});
		// XXX note this erases a search term even if the user
		// earlier kept it.
		if (opt.clear) {
			this.onChange('');
		}
		this.props.onSearchMode(searchMode === 'off' ? null : searchMode);
	}

	onMode = ev => {
		this.setMode(ev.target.dataset.mode, true);
	}

	onKeep = () => {
		this.props.onFilter();
		this.setMode('off');
	}

	onRemove = () => {
		this.props.onFilter(true);
		this.setMode('off');
	}

	onSubgroup = () => {
		// have to add to history before the columns reorder, to
		// prevent the history having wrong column ids.
		this.props.onHistory(this.state.value.trim());
		this.props.onCreateColumn();
		this.setMode('off', {history: false});
	}

	onZoom = () => {
		this.props.onZoom();
		this.setMode('off');
	}

	onContinue = () => {
		this.setMode('off', {clear: false});
	}

	onOpenHistory = () => {
		this.setState({historyOpen: !this.state.historyOpen});
	}

	onHistory = value => {
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

	render() {
		var {matches, sampleCount, searchMode, mode} = this.props,
			disableActions = !(matches > 0 && matches < sampleCount),
			noshow = (mode !== "heatmap"),
			buttons = noshow ? null : modeButtons[searchMode || 'off'](this, disableActions);
		return (
			<div className={compStyles.SampleSearch}>
				{buttons}
			</div>
		);
	}
}
