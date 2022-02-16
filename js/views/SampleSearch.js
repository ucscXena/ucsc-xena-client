import {
	Box,
	FormControl,
	FormHelperText,
	Icon,
	IconButton,
	Input,
	Menu,
	MenuItem,
	Tooltip
} from "@material-ui/core";
import PureComponent from '../PureComponent';
var React = require('react');
var Rx = require('../rx').default;
import {createVignette} from '../containers/vignette';
import HelpBox from '../views/HelpBox';
import {xenaColor} from "../xenaColor";

// Styles
var sxHistoryButton = {
	position: 'absolute',
	right: 0,
	top: -12,
};
var sxSamplePicker = {
	marginLeft: 4,
	'&:hover': {
		backgroundColor: 'transparent',
	},
};
var sxSamplePickerPicking = {
	backgroundColor: xenaColor.BLACK_38,
	'&:hover': {
		backgroundColor: xenaColor.BLACK_38,
	},
};

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
		{historyOpen, value} = comp.state,
		hasHistory = history.length > 0,
		noshow = (mode !== "heatmap");
	const showHistoryButton = !noshow && hasHistory;
	const formWidth = pickSamples ? 800 : 400;

	return (
		<>
			<Box component={FormControl} sx={{transition: 'width 500ms', width: formWidth}}>
				<Tooltip title={tooltips.input}>
					<Input
						disabled={noshow}
						inputRef={comp.setRef}
						margin='none'
						onBlur={comp.onHideCaret}
						onChange={comp.onSearchChange}
						onClick={comp.onCaret}
						onFocus={comp.onCaret}
						onKeyUp={comp.onCaret}
						placeholder={placeholder[pickSamples]}
						spellCheck={false}
						type='text'
						value={value || ''}/>
				</Tooltip>
				<FormHelperText>{`${matches} matching samples`}</FormHelperText>
			</Box>
			{showHistoryButton &&
			<Tooltip title={tooltips.history}>
				<Box component={IconButton} onClick={comp.onOpenHistory} sx={sxHistoryButton}>
					<Icon fontSize='large'>arrow_drop_down</Icon>
				</Box>
			</Tooltip>}
			<Menu
				anchorEl={comp.input}
				anchorOrigin={{horizontal: 'left', vertical: 'bottom'}}
				getContentAnchorEl={null}
				onClose={comp.onHideHistory}
				open={historyOpen}
				PaperProps={{style: {maxWidth: formWidth, width: '100%'}}}>
				{history.map((b, i) =>
					<MenuItem data-value={b} dense key={i} onClick={() => comp.onHistory(b)} value={b}>{b}</MenuItem>)}
			</Menu>
		</>);
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
	state = {filterMenuEl: null, historyOpen: false, value: this.props.value};

	componentDidMount() {
		var highlight = new Rx.Subject();
		this.highlight = highlight.next.bind(highlight);
		this.sub = highlight.startWith(undefined).distinctUntilChanged()
			.subscribe(hl => this.props.onHighlightSelect(hl));
	}

	componentWillUnmount() {
		this.sub.unsubscribe();
	}

	UNSAFE_componentWillReceiveProps(newProps) {//eslint-disable-line camelcase
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

	onSearchChange = (event) => {
		var {onChange} = this.props;
		const value = event.target.value;
		this.setState({value});
		onChange(value);
	};

	onSamplesSubmit = (value) => {
		var {onChange} = this.props;
		this.setState({value});
		onChange(value);
	};

	setRef = ref => {
		this.input = ref;
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

	onCloseFilterMenu = () => {
		this.setState({filterMenuEl: null});
	}

	onOpenFilterMenu = (event) => {
		this.setState({filterMenuEl: event.currentTarget});
	}

	onOpenHistory = () => {
		this.setState({historyOpen: true});
	}

	onHistory = value => {
		this.setState({historyOpen: false});
		this.props.onHistory(value); // move to front of history
		this.props.onChange(value);
	}

	onHideHistory = () => {
		this.setState({historyOpen: false});
	}

	onRemove = () => {
		this.props.onHistory(this.state.value.trim());
		this.props.onFilter(true);
		this.onCloseFilterMenu();
	}

	onKeep = () => {
		this.props.onHistory(this.state.value.trim());
		this.props.onFilter(false);
		this.onCloseFilterMenu();
	}

	onClear = () => {
		this.props.onResetSampleFilter();
		this.onCloseFilterMenu();
	}

	onRemoveNulls = () => {
		this.props.onIntersection();
		this.onCloseFilterMenu();
	}

	onCreateColumn = () => {
		// have to add to history before the columns reorder, to
		// prevent the history having wrong column ids.
		this.props.onHistory(this.state.value.trim());
		this.props.onCreateColumn();
		this.onCloseFilterMenu();
	}

	onZoom = () => {
		this.props.onHistory(this.state.value.trim());
		this.props.onZoom();
		this.onCloseFilterMenu();
	}

	render() {
		var {matches, sampleCount, sampleFilter, mode, pickSamples, onPickSamples} = this.props,
			{inputHelp, pickHelp, actionHelp} = this.props,
			disableActions = !(matches > 0 && matches < sampleCount),
			noshow = (mode !== "heatmap");
		var {filterMenuEl} = this.state;

		return (
			<>
				{inputHelp(input(this))}
				{pickHelp(
					<Tooltip title='Pick samples'>
						<span>
							<Box
								component={IconButton}
								disabled={noshow}
								onClick={onPickSamples}
								sx={{...sxSamplePicker, ...(pickSamples && sxSamplePickerPicking)}}>
								<Icon fontSize='large'>colorize</Icon>
							</Box>
						</span>
					</Tooltip>)}
				{actionHelp(
					<>
						<Tooltip disableFocusListener title='Filter + subgroup actions'>
							<span>
								<IconButton disabled={noshow} onClick={this.onOpenFilterMenu}>
									<Icon fontSize='large'>filter_list</Icon>
								</IconButton>
							</span>
						</Tooltip>
						<Menu
							anchorEl={filterMenuEl}
							anchorOrigin={{horizontal: 'left', vertical: 'top'}}
							getContentAnchorEl={null}
							onClose={this.onCloseFilterMenu}
							open={Boolean(filterMenuEl)}>
							<MenuItem disabled={disableActions} onClick={this.onKeep}>Keep samples</MenuItem>
							<MenuItem disabled={disableActions} onClick={this.onRemove}>Remove samples</MenuItem>
							<MenuItem disabled={!sampleFilter} onClick={this.onClear}>Clear samples filter</MenuItem>
							<MenuItem onClick={this.onRemoveNulls}>Remove samples with nulls</MenuItem>
							<MenuItem disabled={disableActions} onClick={this.onZoom}>Zoom</MenuItem>
							<MenuItem disabled={disableActions} onClick={this.onCreateColumn}>New subgroup column</MenuItem>
						</Menu>
					</>)}
				<IconButton disabled={noshow} onClick={this.props.help.start}><Icon fontSize='large'>help_outline</Icon></IconButton>
			</>
		);
	}
}

export var SampleSearch = createVignette(helpSteps, Search);
