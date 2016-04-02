/*global require: false, module: false */
'use strict';

var React = require('react');
var {Button, ButtonToolbar, Modal, Glyphicon, Nav, NavItem} = require('react-bootstrap/lib');
var CohortSelect = require('./views/CohortSelect');
var DatasetSelect = require('./views/DatasetSelect');
var _ = require('./underscore_ext');
var uuid = require('./uuid');
require('./ColumnEdit.css');
var phenotypeEdit = require('./views/PhenotypeEdit');
var geneEdit = require('./views/GeneEdit');
var geneProbeEdit = require('./views/GeneProbeEdit');
var {PropTypes} = React;

var editors = {
	'clinicalMatrix': phenotypeEdit,
	'mutationVector': geneEdit,
	'none': {Editor: () => <span></span>, valid: () => false}
};

var pickEditor = (m) => {
	return _.get(editors, _.get(m, 'type', 'none'), geneProbeEdit);
}

function workflowIndicators(positions, defs, onHide) {
	// Show all breadcrumbs regardless of where in the workflow the user is in.
	let count = 0,
		activeSection = _.findKey(positions, s => s);
	let tabs = _.map(_.omit(defs, def => def.omit), (def, key) => {
		count++;
		let navTitle = `${count}. Select ${def.name}`;
		//className = (activeSection === key) ? 'breadcrumb-active' : 'breadcrumb-inActive';
		return (
			<NavItem eventKey={key} key={key} disabled>
				<span className='lead'>{navTitle}</span>
			</NavItem>
		)
	});
	return (
		<Modal.Header onHide={onHide} closeButton>
			<Nav bsStyle='pills' activeKey={activeSection}>{tabs}</Nav>
		</Modal.Header>
	);
}

function updateChoice(currentPosition, defs, oldChoices) {
	/*
	 1. Find specific section within defs collection.
	 2. Sections that do not represent 'prevPosition' keep their values -- are not changed
	 3. Once found, reset all 'choice' params (e.g. 'staged' and 'committed') to null.
	 */
	let comparePosition = _.getIn(defs, [currentPosition, 'next']);
	let updatedChoices = _.mapObject(oldChoices, (s, key) => {
		if (key === comparePosition) {
			comparePosition = _.getIn(defs, [comparePosition, 'next']);
			return null;
		} else {
			return s;
		}
	});

	return updatedChoices;
}

function updatePositions(newSection, oldPositions) {
	//Set new sectopm to true, and all other defs to false
	return _.mapObject(oldPositions, (value, section) => (section === newSection));
}

function makeLabel(content, label) {
	return (
		<div className='row lead'>
			<div className="col-md-4 text-right">{label}</div>
			<div className="col-md-8 text-left chosen-values">{content}</div>
		</div>
	);
}

var NavButtons = React.createClass({
	propTypes: {
		btnSize: PropTypes.string,
		choices: PropTypes.object,
		onCancel: PropTypes.func,
		onForward: PropTypes.func,
		onPrev: PropTypes.func,
		positions: PropTypes.object
	},
	makeForwardBtn: function(currentSection) {
		/* FORWARD BTN: Select | Next | Done
		 - Make visible ALL the time
		 - Enable when either of the choices are made for the current section
		 */
		let btnLabel,
			icon = '',
			{btnSize, choices, onForward, defs} = this.props,
			disabled = !choices[currentSection];

		if (!defs[currentSection].prev) {
			btnLabel = 'Select';
		} else if (defs[currentSection].next && defs[currentSection].prev) {
			icon = "menu-right";
			btnLabel = 'Next';
		} else {
			btnLabel = 'Done';
		}

		return (<Button key="FORWARD" bsStyle='primary' disabled={disabled}
						onClick={onForward} bsSize={btnSize}>
			{btnLabel} {disabled ? null : <Glyphicon glyph={icon}/>}</Button>);
	},
	render: function() {
		let buttons = [],
			{btnSize, defs, onBack, onCancel, positions} = this.props,
			currentSection = _.findKey(positions, (status) => status),
			prevSection = defs[currentSection].prev;
		/* PREV && CANCEL
		 - Make visible when not on beg section
		 - Always enabled
		 */
		if (prevSection) {
			if (!defs[prevSection].omit) {
				buttons.push(
					<Button key='BACK' onClick={onBack} bsStyle='info'
							bsSize={btnSize}><Glyphicon glyph='menu-left' /> Prev
					</Button>);
			}
			buttons.push(<Button key="CANCEL" onClick={onCancel}
								 bsStyle='default' bsSize={btnSize}>Cancel</Button>);
		}
		buttons.push(this.makeForwardBtn(currentSection));
		return (
			<ButtonToolbar>{buttons}</ButtonToolbar>
		);
	}
});

var ColumnEdit = React.createClass({
	defs: {
		cohort: {
			omit: true,
			name: 'Cohort',
			next: 'dataset',
			prev: null
		},
		dataset: {
			omit: false,
			name: 'Dataset',
			next: 'editor',
			prev: 'cohort'
		},
		editor: {
			omit: false,
			name: 'data slice',
			next: null,
			prev: 'dataset'
		}
	},
	getInitialState: function () {
		let {appState: {cohort}} = this.props;
		return {
			choices: {
				cohort: cohort,
				dataset: null,
				editor: null
			},
			positions: {
				cohort: cohort ? false : true,
				dataset: cohort ? true : false,
				editor: false
			}
		};
	},
	addColumn: function (settings) {
		let {callback, appState: {datasets}} = this.props,
			dsID = this.state.choices.dataset,
			label = datasets[dsID].label,
			assembly = datasets[dsID].assembly;

		settings = _.assoc(settings,
			'width', 200, // XXX move this default setting?
			'columnLabel', {user: label, 'default': label},
			'assembly', assembly,
			'dsID', dsID);
		this.props.onHide();
		callback(['add-column', uuid(), settings]);
	},
	onCohortSelect: function(value) {
		this.setChoice('cohort', value);
	},
	onDatasetSelect: function (dsID) {
		var {callback, appState: {datasets}} = this.props,
			meta = _.get(datasets, dsID);

		this.setChoice('dataset', dsID);
		callback(['edit-dataset', dsID, meta]);
	},
	onBack: function() {
		let {positions} = this.state,
			currentSpot = _.findKey(positions, (position) => position),
			newSpot = this.defs[currentSpot].prev;
		if (newSpot) {
			/*
			 - Exception situation where user cannot go back to 'Cohort' section
			 after it's selected.
			 - This exeption is already take care of simply by not displaying back button
			 within set of Navigation buttons
			 */
			let newPositions = updatePositions(newSpot, positions);
			this.setState({positions: newPositions});
		}
	},
	onForward: function() {
		let newState = {},
			{choices, positions} = this.state,
			currentSpot = _.findKey(positions, (position) => position),
			currentSpotDef = this.defs[currentSpot],
			nextSpot = currentSpotDef.next;

		if (this.defs[currentSpot].omit)
			this.props.callback([currentSpot, choices[currentSpot]]);

		// Set new position in workflow if necessary and reset choices
		if (nextSpot) {
			_.extendOwn(newState, {
				choices: updateChoice(currentSpot, this.defs, choices),
				positions: updatePositions(nextSpot, positions)
			});

			this.setState(newState);
		}
	},
	setChoice: function(section, newValue) {
		let newState = _.assocIn(this.state, ['choices', section], newValue);
		this.setState(newState);
	},
	onSetEditor: function (newEditor) {
		var oldEditor = this.state.choices.editor || {};
		this.setChoice('editor', _.merge(oldEditor, newEditor));
	},
	render: function () {
		var {choices, positions} = this.state,
			{appState: {cohorts, columnEdit, datasets, servers}, onHide} = this.props,
			features = _.getIn(columnEdit, ['features']),
			meta = choices.dataset && _.get(datasets, choices.dataset);
		var {Editor, valid, apply} = positions['editor'] && pickEditor(meta),
			currentPosition = _.findKey(positions, p => p);
		return (
			<Modal show={true} className='columnEdit container' enforceFocus>
				{this.defs[currentPosition].omit ? null : workflowIndicators(positions, this.defs, onHide)}
				<Modal.Body>
					{positions['cohort'] ?
						<CohortSelect onSelect={this.onCohortSelect} cohorts={cohorts}
									  cohort={choices.cohort} makeLabel={makeLabel}>
						</CohortSelect> : null
					}
					{positions['dataset'] || choices['dataset'] ?
						<DatasetSelect datasets={datasets} makeLabel={makeLabel}
							event='dataset' value={choices.dataset}
							disable={choices.dataset && !positions['dataset']}
							onSelect={this.onDatasetSelect} servers={servers.user}>
						</DatasetSelect> : null
					}
					{Editor ? <Editor {...columnEdit} setEditorState={this.onSetEditor}
						{...(choices['editor'] || {})} makeLabel={makeLabel}
													  hasGenes={meta && !!meta.probeMap}/> : null}
					<br />
				</Modal.Body>
				<div className="form-group selection-footer">
					<span className="col-md-6 col-md-offset-3 text-center">
						<NavButtons {...this.state} btnSize='small' onBack={this.onBack}
													onCancel={onHide} defs={this.defs} onForward={!Editor ? this.onForward
						: () => this.addColumn(apply(features, choices['editor']))}/>
					</span>
					<span className="col-md-3 text-right">
						<a href="#">I wish I could...</a>
					</span>
				</div>
			</Modal>
		);
	}
});

module.exports = ColumnEdit;
