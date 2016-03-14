/*global require: false, module: false */
'use strict';

var React = require('react');
var {PropTypes} = React;
var Input = require('react-bootstrap/lib/Input');
var Button = require('react-bootstrap/lib/Button');
var ButtonGroup = require('react-bootstrap/lib/ButtonGroup');
var CohortSelect = require('./CohortSelect');
var Modal = require('react-bootstrap/lib/Modal');
var Select = require('./Select');
var DatasetSelect = require('./DatasetSelect');
var _ = require('./underscore_ext');
var trim = require('underscore.string').trim;
var uuid = require('./uuid');
require('./ColumnEdit.css');

// Select a phenotype feature from those on the server.
var PhenotypeEdit = React.createClass({
	apply: function () {
		var {feature} = this.state,
			fieldTxt = _.find(this.props.features, f => f.value === feature).label;
		this.props.update({
			fields: [feature],
			dataType: 'clinicalMatrix',
			fieldLabel: {user: fieldTxt, 'default': fieldTxt}
		});
	},
	// XXX change col-md-offset-10, etc. to react-boostrap style
	render: function () {
		var {feature} = this.state || {};
		var {features} = this.props;
		return (
			<div>
				<div className='form-group'>
					<label className='col-md-2 control-label'>View:</label>
					<Select value={feature}
							callback={([, f]) => this.setState({feature: f})}
							options={features} />
				</div>
				<div className='form-group'>
					<Button disabled={!feature} onClick={this.apply} className='col-md-offset-10'>Apply</Button>
				</div>
				<hr />
			</div>
		);
	}
});

// Select a gene.
var GeneEdit = React.createClass({
	apply: function () {
		var gene = trim(this.state.gene);
		this.props.update({
			fields: [gene],
			dataType: 'mutationVector',
			fieldLabel: {user: gene, 'default': gene},
			sFeature: 'impact'
		});
	},
	render: function () {
		var {gene} = this.state || {};
		return (
			<div>
				<div className='form-group'>
					<label className='col-md-2 control-label'>Gene:</label>
					<div className='col-md-4'>
						<Input value={gene}
							   onChange={ev => this.setState({gene: ev.target.value})}
							   type='text'/>
					</div>
				</div>
				<div className='form-group'>
					<p className='col-md-offset-2'>e.g. TP53</p>
				</div>
				<div className='form-group'>
					<Button disabled={!trim(gene)} onClick={this.apply} className='col-md-offset-10'>Apply</Button>
				</div>
				<hr />
			</div>
		);
	}
});

function toGeneList(str) {
	// Have to wrap trim because it takes a 2nd param.
	return _.filter(_.map(str.split(/,| |\n|\t/), s => trim(s), _.identity));
}

// Select a list of genes, or list of identifiers. genes/identifier mode
// is selectable if the dataset supports gene views.
var GeneProbeEdit = React.createClass({
	getInitialState () {
		// Default to genes, unless we have no genes display.
		return {
			genes: this.props.genes
		};
	},

	componentWillReceiveProps (nextProps) {
		// Reset 'genes' state if we no longer have a genes display.
		this.setState({genes: nextProps.genes ? this.state.genes : false});
	},

	apply: function () {
		var {list, genes} = this.state,
			fields = toGeneList(list),
			fieldTxt = fields.join(', ');
		this.props.update({
			fields: fields,
			dataType: genes ? (fields.length > 1 ? 'geneMatrix' : 'geneProbesMatrix') :
				'probeMatrix',
			fieldLabel: {user: fieldTxt, 'default': fieldTxt}
		});
	},

	// this.state
	//     genes: boolean User has selected 'genes' display.
	//     examples: list<string> Identifier examples from server.
	//     list: string List of genes/identifiers entered by user.
	// this.props
	//     genes: boolean Whether the dataset has a gene mapping.
	//
	render: function () {
		var {genes, list} = this.state || {};
		var {examples} = this.props;
		var help = genes ? 'e.g. TP53 or TP53, PTEN' :
			// babel-eslint/issues/31
			examples ? `e.g. ${examples[0]} or ${examples[0]}, ${examples[1]}` : ''; //eslint-disable-line comma-spacing
		return (
			<div>
				{this.props.genes ?
					<div className='form-group'>
						<label className='col-md-2 control-label-pending'>Input:</label>
						<div className='col-md-4'>
							<Input onChange={() => this.setState({genes: true})}
								   checked={genes}
								   type='radio' name='mode' value='genes' label='genes'/>
							<Input onChange={() => this.setState({genes: false})}
								   checked={!genes}
								   type='radio' name='mode' value='identifiers' label='identifiers'/>
						</div>
					</div> :
					null}
				<div className='form-group'>
					<label className='col-md-2 control-label-pending'>{genes ? 'Genes:' : 'Identifiers:'}</label>
					<div className='col-md-9'>
						<Input onChange={ev => this.setState({list: ev.target.value})}
							   type='textarea' value={list} />
					</div>
				</div>
				<div className='form-group'>
					<p className='col-md-offset-2'>{help}</p>
				</div>
				<div className='form-group'>
					<Button disabled={!(list && toGeneList(list).length)}
							onClick={this.apply} className='col-md-offset-10'>Apply</Button>
				</div>
				<hr />
			</div>
		);
	}
});

function pickEditor(meta, update, columnEdit) {
	if (meta.type === 'clinicalMatrix') {
		return <PhenotypeEdit update={update} features={_.getIn(columnEdit, ['features'])}/>;
	}

	if (meta.type === 'mutationVector') {
		return <GeneEdit update={update}/>;
	}

	return <GeneProbeEdit genes={!!meta.probeMap} update={update} examples={_.getIn(columnEdit, ['examples'])}/>;
}

let NavButtons = React.createClass({
	propTypes: {
		choicess: PropTypes.object,
		onCancel: PropTypes.func,
		onNext: PropTypes.func,
		onPrev: PropTypes.func,
		positions: PropTypes.object,
		sections: PropTypes.object
	},
	makeForwardBtn: function(currentSection) {
		/* FORWARD BTN: Select | Next | Done
		 - Make visible ALL the time
		 - Enable when either of the choices are made for the current section
		 */
		let btnLabel,
			{choices, onForward, sections} = this.props,
			disabled = _.every(choices[currentSection], (value) => _.isEmpty(value));

		if (!sections[currentSection].prev) {
			btnLabel = 'Select';
		} else if (sections[currentSection].next && sections[currentSection].prev) {
			btnLabel = 'Next';
		} else {
			btnLabel = 'Done';
		}

		return (<Button key="forward" bsStyle='success' bsSize='large'
						disabled={disabled} onClick={onForward}>{btnLabel}</Button>);
	},
	render: function() {
		let buttons = [],
			{choices, onBack, onCancel, positions, sections} = this.props,
			currentSection = _.findKey(positions, (status) => status),
			wipSection = _.findKey(choices, (sectionChoice) => _.isEmpty(sectionChoice.recorded)),
			begSection = _.findKey(sections, (sect) => !sect.prev),
			endSection = _.findKey(sections, (sect) => !sect.next);

		if (_.isEmpty(choices[begSection].recorded)) {
			render (null);
		} else {
			buttons.push(this.makeForwardBtn(currentSection));

			/* PREV && CANCEL
			 - Make visible when not on beg section
			 - Always enabled
			 */
			if (sections[currentSection].prev){
				buttons.push(<Button key="back" onClick={onBack}
									 bsStyle='default' bsSize='large'>Prev</Button>);

				buttons.push(<Button key="cancel" onClick={onCancel}
									 bsStyle='warning' bsSize='large'>Cancel</Button>);
			}

			return <ButtonGroup>{buttons}</ButtonGroup>;
		}
	}
})

function updateSelection(section, sections, oldSelections) {
	let currentSection = section;
	let newSelections = _.mapObject(oldSelecions, (s, key) => {
		let selection = (key === currentSection && _.some(oldSelections[currentSection], (s) => s))
			? _.mapObject(s, param => null) : s;

		currentSection = sections[currentSection].next;
		return selection;
	});

	return _.assocIn(newSelections, [section, 'recorded'], oldSelections[section].staged);
}

var ColumnEdit = React.createClass({
	sections: {
		cohort: {
			next: 'dataset',
			prev: null
		},
		dataset: {
			next: 'splice',
			prev: 'cohort'
		},
		splice: {
			next: null,
			prev: 'dataset'
		}
	},
	getInitialState: function () {
		let {appState: {cohort}} = this.props;
		return {
			choices: {
				cohort: {
					recorded: cohort,
					staged: ''
				},
				dataset: {
					recorded: '',
					staged: ''
				},
				splice: {
					recorded: '',
					staged: ''
				}
			},
			positions: {
				cohort: cohort ? false : true,
				dataset: cohort ? true : false,
				splice: false
			}
		};
	},
	addColumn: function (settings) {
		let {callback, appState: {datasets}} = this.props,
			label = datasets[this.state.dataset].label;
		settings = _.assoc(settings,
			'width', 200, // XXX move this default setting?
			'columnLabel', {user: label, 'default': label},
			'dsID', dsId);
		this.props.onHide();
		callback(['add-column', uuid(), settings]);
	},
	onForward: function() {
		let {choices, positions, sections} = this.state;
		// Transfer staged value to recorded parameter
		let currentSection = _.findKey(positions, (position) => position);
		let newSelections = updateSelection(currentSection, sections, choices);

		// set position
		debugger;

		//this.setState({
		//	positions: newPositions,
		//	choices: newSelections
		//})
	},
	stageSelection: function([section, newValue]) {
		let newState = _.assocIn(this.state, ['choices', section, 'staged'], newValue);
		this.setState(newState);
	},
	selectCohort: function() {
		this.stageSelection(arguments);
		this.props.callback(arguments);
	},
	selectDataset: function ([section, dsID]) {
		var {callback, appState: {datasets}} = this.props,
			meta = _.get(datasets, dsID);

		this.stageSelection([section, dsID]);
		callback([`edit-${section}`, dsID, meta]);
	},
	test: function(btnEvent) {
		debugger;
		console.log(`btn was pressed...`);
	},
	render: function () {
		let {choices} = this.state,
			{appState: {cohort, cohorts, columnEdit, datasets}} = this.props,
			meta = choices.dataset.recorded && _.get(datasets, choices.dataset.recorded);
		let dsID = choices.dataset.staged || choices.dataset.staged;
		var editor = meta ? pickEditor(meta, this.addColumn, columnEdit) : null;
		/*
		 Instead of using an allocated approach (1 row for each requirement,
		 the presentation of each responsibility will be based on position within
		 workflow
		 */
		return (
			<Modal {...this.props} show={true} className="columnEdit">
				<Modal.Header closeButton>
					<Modal.Title>Workflow Breadcrumbs</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<form className='form-horizontal container'>
						{choices.cohort.recorded ? null :
							<CohortSelect callback={this.selectCohort}
										  cohort={cohort} cohorts={cohorts}
										  disable={choices.cohort.recorded ? true : false}>
								<div className='control-label-pending'>Select Cohort</div>
							</CohortSelect>
						}
						{_.isEmpty(choices.cohort.recorded) ? null :
							<DatasetSelect
								disable={choices.dataset.recorded ? true : false}
								datasets={datasets} value={dsID} event='dataset'
								callback={this.selectDataset}>
								<div className='control-label-pending'>Select Dataset</div>
							</DatasetSelect>
						}
					</form>
					{editor}
					<NavButtons {...this.state} sections={this.sections}
												onForward={this.test} onBack={this.test} onCancel={this.test}/>
				</Modal.Body>
				<section className="footer">
					I wish I could...
				</section>
			</Modal>
		);
	}
});

module.exports = ColumnEdit;