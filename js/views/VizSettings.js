/*eslint camelcase: 0, no-use-before-define: 0 */
/*eslint-env browser */
/*jshint browser: true */
/*global document: false, require: false, module: false */

// Config UI for custom viz settings for heatmaps.
//
// State schema. This is the goal, not the current implementation. If
// the user has never modified the default settings, vizSettings is undefined.
//
// When the user modifies colNormalization or color parameters, they are
// written into vizSettings. vizSettings can have normalization or color
// parameters, or both. All color parameters are present if any are set.
// The minStart/maxStart are optional, so may be null if other color parameters
// are set.
//
// vizSettings = undefined |
//               {
//                 colNormalization: 'subset' | 'none'
//               } |
//               {
//                 min: float,
//                 minStart: float | null,
//                 maxStart: float | null,
//                 max: float
//               } |
//               {
//                 colNormalization: 'subset' | 'none'
//                 min: float,
//                 minStart: float | null,
//                 maxStart: float | null,
//                 max: float
//               }

// Refactoring notes:
// The default column normalization is fetched from the server. Instead it should come from
// the state, or from a data cache, because we've fetched that already.

'use strict';
var _ = require('../underscore_ext');
var floatImg = require('../../images/genomicFloatLegend.jpg');
var customFloatImg = require('../../images/genomicCustomFloatLegend.jpg');
var React = require('react');
var ReactDOM = require('react-dom');
var {Modal, DropdownButton, MenuItem, Grid, Row, Col, Button, ButtonToolbar, ButtonGroup} = require('react-bootstrap/lib/');
var Input = require('react-bootstrap/lib/Input');
var image = require('react-bootstrap/lib/Image');

function vizSettingsWidget(node, onVizSettings, vizState, id, hide, defaultNormalization, defaultColorClass, valueType) {
	var state = vizState;
	function datasetSetting() {
		var node, div = document.createElement("div");
		if (valueType === "float" || valueType === 'segmented') {
			node = document.createElement("div");
			allFloat(node);
			div.appendChild(node);

			node = document.createElement("span");
			ReactDOM.render(React.createElement(finishButtonBar), node);
			div.appendChild(node);
		}
		return div;
	}

	function allFloat(div) {
		var node;

		if (valueType === "float") {
			// normalization
			node = document.createElement("div");
			ReactDOM.render(React.createElement(normalizationDropDown), node);
			div.appendChild(node);
			div.appendChild(document.createElement("br"));
		}

		// color choice : green red or blue red
		node = document.createElement("div");
		ReactDOM.render(React.createElement(colorDropDown), node);
		div.appendChild(node);
		div.appendChild(document.createElement("br"));

		// color scale
		node = document.createElement("div");
		ReactDOM.render(React.createElement(scaleChoice), node);
		div.appendChild(node);
		div.appendChild(document.createElement("br"));
	}

	// discard user changes & close.
	var finishButtonBar = React.createClass({
		handleCancelClick () {
			hide();
			onVizSettings(id, state);
		},
		handleDoneClick () {
			hide();
		},
		render () {
			return (
				<ButtonToolbar>
					<Button onClick = {this.handleCancelClick}>Cancel</Button>
					<Button bsStyle="primary" onClick = {this.handleDoneClick}>Done</Button>
				</ButtonToolbar>
			);
		}
	});

	function getInputSettingsFloat(settings) {
		return _.fmap(settings, parseFloat);
	}

	function validateSettings(s) {
		var vals = _.fmap(s, parseFloat),
			fmtErrors = _.fmap(vals, function (v, k) {
				return (isNaN(v) && s[k]) ? "Invalid number." : "";
			}),
			missing = _.fmap(s, _.constant(null)),
			rangeErrors;

		/*jshint -W018 */ /* allow xor idiom */
		if (!s.minStart !== !s.maxStart) { // xor
			missing.minStart = 'Both 0% values must be given to take effect.';
		}
		// XXX check for missin min & max

		if (s.minStart && s.maxStart && !fmtErrors.minStart && !fmtErrors.maxStart) {
			// wrong if missing maxStart: we compare against the wrong thing.
			rangeErrors = {
				max: null,
				maxStart: vals.maxStart <= vals.max ? null :  'Should be lower than max',
				minStart: vals.minStart <= vals.maxStart ? null : 'Should be lower than maxStart',
				min: vals.min <= vals.minStart ? null : 'Should be lower than minStart'
			};
		} else {
			rangeErrors = {
				max: null,
				min: vals.min <= vals.max ? null : 'Should be lower than max'
			};
		}

		return _.fmap(fmtErrors, function (err, k) {
			return _.filter([err, rangeErrors[k], missing[k]], _.identity).join(' ');
		});
	}

	function settingsValid(errors) {
		return _.every(errors, function (s) { return !s; });
	}

	function valToStr(v) {
		if (v === "-") {
			return v;
		}
		return (!isNaN(v) && (v !== null) && (v !== undefined)) ? "" + v : "";
	}

	var scaleChoice = React.createClass({
		annotations: {
			"max": "max: high color 100% saturation",
			"maxStart": "maxStart: high color 0% saturation",
			"minStart": "minStart: low color 0% saturation",
			"min": "min: low color 100% saturation"
		},
		defaults: {
			max: 1,
			maxStart: null,
			minStart: null,
			min: -1
		},
		getInitialState () {
			//check if there is custom value
			let custom = colorParams.some(function (param) {
					if (getVizSettings(param)) {
						return true;
					}
				});

			return {
				mode: custom ? "Custom" : "Auto",
				settings: custom ? oldSettings : _.clone(this.defaults),
				errors: {}
			};
		},
		autoClick () {
			this.setState({mode: "Auto"});
			this.setState({settings: _.clone(this.defaults)});
			this.setState({errors: {}});
			onVizSettings(id, _.omit(state, colorParams));
		},
		customClick () {
			this.setState({mode: "Custom"});
			onVizSettings(id, _.merge(state, getInputSettingsFloat(this.state.settings)));
		},
		changeTextAction() {
			var errors = validateSettings(this.state.settings);
			this.setState({errors: errors});

			if (settingsValid(errors)) {
				onVizSettings(id, _.merge(state, getInputSettingsFloat(this.state.settings)));
			}
		},
		buildCustomColorScale () {
			let thisObj = this;
			node = colorParams.map( param => {
				let value = valToStr(this.state.settings[param]),
					label = this.annotations[param],
					error = this.state.errors[param];

				function scaleParamChange (ev) {
					let settings = thisObj.state.settings;
					settings[param] = ev.target.value;
					thisObj.setState({ settings: settings });
					thisObj.changeTextAction();
				}

				return (
					<Row>
						<Col xs={6} md={5} lg={2}>{label}</Col>
						<Col xs={3} md={2} lg={1}>
							<Input type='textinput' placeholder="Auto"
								value={value} onChange={scaleParamChange}/>
						</Col>
						<Col xs={3} md={2} lg={1}>
							<label bsStyle="danger">{error}</label>
						</Col>
					</Row>
				);
			});
			return node;
		},

		render () {
			let mode = this.state.mode,
				autoMode = (this.state.mode === "Auto"),
				modes = ["Auto", "Custom"],
				funcMapping = {
					"Auto": this.autoClick,
					"Custom": this.customClick
				},
				buttons = modes.map(mode => {
					let active = (this.state.mode === mode),
						func = funcMapping[mode];
					return active ? (<Button bsStyle="primary" onClick={func} active>{mode}</Button>) :
						(<Button onClick={func}>{mode}</Button>);
				}),
				picture = autoMode ? (<image src={floatImg} responsive/>) :
					(<image src={customFloatImg} responsive/>),
				enterInput = autoMode ? null : this.buildCustomColorScale();

			return (
				<Grid>
					<Row>
						<Col xs={3} md={2} lg={1}>Scale</Col>
						<Col xs={15} md={10} lg={5}>
							<ButtonGroup>{buttons}</ButtonGroup>
							<div>
								{picture}
								<Grid>
									{enterInput}
								</Grid>
							</div>
						</Col>
					</Row>
				</Grid>
			);
		}
	});

	function setVizSettings(key, value) {
		onVizSettings(id, _.assoc(state, key, value));
	}

	function getVizSettings(key) {
		return _.getIn(state, [key]);
	}

	var normalizationDropDown = React.createClass({
		getInitialState () {
			let	value = getVizSettings('colNormalization') || defaultNormalization || 'none',
				mapping = {
					"none": "none",
					"subset": "subset",
					true: "subset"
				};
			return {
				optionValue: mapping[value] || "none"
			};
		},
		handleSelect: function (evt, evtKey) {
			var key = "colNormalization";
			setVizSettings(key, evtKey);
			this.setState({optionValue: evtKey});
		},
		render () {
			let optionValue = this.state.optionValue,
				options = [
					{"key": "none", "label": "off"},
					{"key": "subset", "label": "mean subtracted per column across samples"},
				],
				activeOption = _.find(options, obj => {
					return obj.key === optionValue;
				}),
				title = activeOption ? activeOption.label : 'Select',
				menuItemList = options.map(obj => {
					var active = (obj.key === optionValue);
					return active ? (<MenuItem eventKey={obj.key} active>{obj.label}</MenuItem>) :
						(<MenuItem eventKey={obj.key}>{obj.label}</MenuItem>);
				});
			return (
				<Grid>
					<Row>
						<Col xs={3} md={2} lg={1}>Transform</Col>
						<Col xs={15} md={10} lg={5}>
							<DropdownButton title={title} onSelect={this.handleSelect} >
								{menuItemList}
							</DropdownButton>
						</Col>
					</Row>
				</Grid>
			);
		}
	});

	var colorDropDown = React.createClass({
		getInitialState () {
			let	value = getVizSettings('colorClass') || defaultColorClass || 'default',
				mapping = {
					"default": "default",
					"expression": "expression",
					"blueBlackYellow": "blueBlackYellow",
					"clinical": "default"
				};
			return {
				optionValue: mapping[value] || 'default'
			};
		},
		handleSelect: function (evt, evtKey) {
			var key = "colorClass";
			setVizSettings(key, evtKey);
			this.setState({optionValue: evtKey});
		},
		render () {
			let optionValue = this.state.optionValue,
				options = [
					{"key": "default", "label": "red-white-blue"},
					{"key": "expression", "label": "red-black-green"},
					{"key": "blueBlackYellow", "label": "yellow-black-blue"}
				],
				activeOption = _.find(options, obj => {
					return obj.key === optionValue;
				}),
				title = activeOption ? activeOption.label : 'Select',
				menuItemList = options.map(obj => {
					var active = (obj.key === optionValue);
					return active ? (<MenuItem eventKey={obj.key} active>{obj.label}</MenuItem>) :
						(<MenuItem eventKey={obj.key}>{obj.label}</MenuItem>);
				});
			return (
				<Grid>
					<Row>
						<Col xs={3} md={2} lg={1}>Color</Col>
						<Col xs={15} md={10} lg={5}>
							<DropdownButton title={title} onSelect={this.handleSelect} >
								{menuItemList}
							</DropdownButton>
						</Col>
					</Row>
				</Grid>
			);
		}
	});

	var oldSettings = state,
		colorParams = ["max", "maxStart", "minStart", "min"];

	node.appendChild(datasetSetting());
}

// react wrapper for the legacy DOM code, above.
var SettingsWrapper = React.createClass({
	shouldComponentUpdate: () => false,
	componentDidMount: function () {
		var {refs: {content}, props: {onVizSettings, vizSettings, id, defaultNormalization, colorClass, valueType, onRequestHide}} = this;
		vizSettingsWidget(content, onVizSettings, vizSettings, id, onRequestHide, defaultNormalization, colorClass, valueType);
	},
	render: function () {
		return <div ref='content' />;
	}
});

var VizSettings = React.createClass({
	render: function() {
		var {onRequestHide} = this.props;
		return (
			<Modal show={true} onHide={onRequestHide}>
				<Modal.Header closeButton>
					<Modal.Title>Dataset Visualization Settings</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<SettingsWrapper {...this.props} />
				</Modal.Body>
			</Modal>
		);
	}
});

module.exports = VizSettings;
