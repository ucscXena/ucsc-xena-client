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

function makeBreadcrumbs(positions, defs) {
	// Show all breadcrumbs regardless of where in the workflow the user is in.
	let breadcrumbs = [],
		count = 1,
		section = _.findKey(positions, s => !s.prev);

	do {
		if (!defs[section].omit) {
			let navTitle = `${count}. Select ${defs[section].name}`,
				isActive = positions[section];
			breadcrumbs.push(<NavItem key={count} eventKey={isActive}>{navTitle}</NavItem>);
			count++;
		}
	} while(section = defs[section].next);

	return breadcrumbs;
}

function updateChoice(prevPosition, defs, oldChoices, newValue) {
	/*
	 1. Find specific section within defs collection.
	 2. Sections that do not represent 'prevPosition' keep their values -- are not changed
	 3. Once found, reset all 'choice' params (e.g. 'staged' and 'committed') to null.
	 */
	let currentSpot = prevPosition;
	let newChoices = _.mapObject(oldChoices, (s, key) => {
		if (key === currentSpot) {
			currentSpot = defs[currentSpot].next;
			return _.mapObject(s, param => null);
		} else {
			return s;
		}
	});

	return _.assocIn(newChoices, [prevPosition, 'committed'], newValue);
}

function updatePositions(newSection, oldPositions) {
	/*
	 Set new sectopm to true, and all other defs to false
	 */
	return _.mapObject(oldPositions, (value, section) => (section === newSection));
}

var NavButtons = React.createClass({
	propTypes: {
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
			btnSize = 'large',
			{choices, onForward, defs} = this.props,
			disabled = _.every(choices[currentSection], (value) => _.isEmpty(value));

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
			btnSize = 'large',
			{defs, onBack, onCancel, positions} = this.props,
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
			<div style={{textAlign: 'center'}}>
				<ButtonToolbar>{buttons}</ButtonToolbar>
			</div>
		);
	}
});

var ColumnEdit = React.createClass({
	defs: {
		cohort: {omit: true, name: 'Cohort', next: 'dataset', prev: null},
		dataset: {omit: false, name: 'Dataset', next: 'editor', prev: 'cohort'},
		editor: {omit: false, name: 'Data Editor', next: null, prev: 'dataset'}
	},
	localHubDNS: 'local.xena',
	getInitialState: function () {
		let {appState: {cohort}} = this.props;
		return {
			choices: {
				cohort: {committed: cohort, staged: null},
				dataset: {commited: null, staged: null},
				editor: {commited: null, staged: null}
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
			dsID = this.state.choices.dataset.committed,
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
		this.stageChoice('cohort', value);
	},
	onDatasetSelect: function (dsID) {
		var {callback, appState: {datasets}} = this.props,
			meta = _.get(datasets, dsID);

		this.stageChoice('dataset', dsID);
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
			stagedChoice = choices[currentSpot].staged,
			nextSpot = currentSpotDef.next;

		// Transfer staged value to 'committed' parameter
		if (stagedChoice) {
			_.extendOwn(newState, {
				choices: updateChoice(currentSpot, this.defs, choices, stagedChoice)
			});
			if (this.defs[currentSpot].omit)
				this.props.callback([currentSpot, stagedChoice]);
		}

		// Set new position in workflow if necessary
		if (nextSpot) {
			_.extendOwn(newState, {
				positions: updatePositions(nextSpot, positions)
			});

			this.setState(newState);
		}
	},
	stageChoice: function(section, newValue) {
		let newState = _.assocIn(this.state, ['choices', section, 'staged'], newValue);
		this.setState(newState);
	},
	onSetEditor: function (newEditor) {
		var oldEditor = this.state.choices.editor.staged || {};
		this.stageChoice('editor', _.merge(oldEditor, newEditor));
	},
	render: function () {
		var {choices, positions} = this.state,
			{appState: {cohorts, columnEdit, datasets, servers}, onHide} = this.props,
			features = _.getIn(columnEdit, ['features']),
			meta = choices.dataset.committed && _.get(datasets, choices.dataset.committed);
		var {Editor, valid, apply} = positions['editor'] && pickEditor(meta),
			currentPosition = _.findKey(positions, p => p);
		return (
			<Modal {...this.props} show={true} className='columnEdit container'>
				{!this.defs[currentPosition].omit ?
					<Modal.Header closeButton>
						<Nav bsStyle='pills' activeKey={true}>{makeBreadcrumbs(positions, this.defs)}</Nav>
					</Modal.Header> : null
				}
				<Modal.Body>
					<form className='form-horizontal container'>
						{!choices.cohort.committed || positions['cohort'] ?
							<CohortSelect onSelect={this.onCohortSelect} cohorts={cohorts}
								cohort={choices.cohort.staged || choices.cohort.committed}>
								<div className='control-label-pending'>Select Cohort</div>
							</CohortSelect> : null
						}
						{choices.dataset.committed || positions['dataset'] ?
							<DatasetSelect datasets={datasets} event='dataset'
								onSelect={this.onDatasetSelect}
								localHubUrl={_.find(servers.user, server => server.includes(this.localHubDNS))}
								value={choices.dataset.staged || choices.dataset.committed}
								disable={!_.isEmpty(choices.dataset.committed) && !positions['dataset']}>
								{positions['dataset'] ? <div className='control-label-pending'>Select Dataset</div> : null}
							</DatasetSelect> : null
						}
						{Editor ? <Editor {...columnEdit} setEditorState={this.onSetEditor}
							{...(choices['editor'].staged || {})} hasGenes={meta && !!meta.probeMap}/> : null}
					</form>
					<NavButtons {...this.state} defs={this.defs}
						onForward={Editor ? () => this.addColumn(apply(features, choices['editor'].staged)) : this.onForward}
						onBack={this.onBack} onCancel={onHide} />
					<section className="footer">
						I wish I could...
					</section>
				</Modal.Body>
			</Modal>
		);
	}
});

module.exports = ColumnEdit;