/*eslint camelcase: 0, no-use-before-define: 0 */
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
var React = require('react');
var ReactDOM = require('react-dom');
var {Row, Col} = require("react-material-responsive-grid");
import {Dialog} from 'react-toolbox/lib/dialog';
import {Dropdown} from 'react-toolbox/lib/dropdown';
import {Button} from 'react-toolbox/lib/button';
import {Input} from 'react-toolbox/lib/input';
import vizSettingStyle from "./VizSettings.module.css";

function vizSettingsWidget(node, onVizSettings, vizState, id, hide, defaultNormalization,
	defaultColorClass, valueType, fieldType, data, units) {
	var state = vizState;
	class DatasetSetting extends React.Component {
		render() {
			let settingsContent = valueType === "float" || valueType === 'segmented' ? <AllFloat /> :
				valueType === "mutation" && fieldType === 'SV' ? <Sv /> :
					<NoSettings />;
			return (
				<div>
					{settingsContent}
					<FinishButtonBar/>
				</div>
			);
		}
	}
	class AllFloat extends React.Component {
		render() {
			return (
				<div>
					<div>
						<ColorDropDown />
					</div>
					<br />
					<div>
						<ScaleChoice />
					</div>
					<br />
				</div>
			);
		}
	}
	class Sv extends React.Component {
		render() {
			return (
				<div>
					<div>
						<SvColorDropDown />
					</div>
					<br />
				</div>
			);
		}
	}
	class NoSettings extends React.Component {
		render() {
			return (
				<div>
					<div>No setting adjustments available.</div>
					<br />
					<br />
				</div>
			);
		}
	}

	// discard user changes & close.
	class FinishButtonBar extends React.Component {
	    handleCancelClick = () => {
			hide();
			onVizSettings(id, state);
		};

	    handleDoneClick = () => {
			hide();
		};

	    render() {
			return (
				<div>
					<Button onMouseUp={this.handleCancelClick}
							className={vizSettingStyle.cancelButton}>
						Cancel
					</Button>
					<Button onMouseUp={this.handleDoneClick}
							className={vizSettingStyle.confirmButton}>
						Done
					</Button>
				</div>
			);
		}
	}

	function getInputSettingsFloat(settings) {
		return _.fmap(settings, parseFloat);
	}

	var validateSettings = {
		float: s => {
			var vals = _.fmap(s, parseFloat),
				fmtErrors = _.fmap(vals, function (v, k) {
					return (isNaN(v) && s[k]) ? "Invalid number." : "";
				}),
				missing = _.fmap(s, _.constant(null)),
				rangeErrors;

			/*jshint -W018 */ /* allow xor idiom */
			if (!s.minstart !== !s.maxstart) { // xor
				missing.minstart = 'Both 0% values must be given to take effect.';
			}
			// XXX check for missin min & max

			if (s.minstart && s.maxstart && !fmtErrors.minstart && !fmtErrors.maxstart) {
				// wrong if missing maxStart: we compare against the wrong thing.
				rangeErrors = {
					max: null,
					maxstart: vals.maxstart <= vals.max ? null :  'Should be lower than max',
					minstart: vals.minstart <= vals.maxstart ? null : 'Should be lower than maxStart',
					min: vals.min <= vals.minstart ? null : 'Should be lower than minStart'
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
		},
		segmented: s => {
			var vals = _.fmap(s, parseFloat),
				fmtErrors = _.fmap(vals, v => {
					return isNaN(v) ? "Invalid number." : "";
				}),
				rangeErrors = {
					thresh: vals.thresh >= 0 ? null : 'Should be positive',
					max: vals.max >= 0 ? null : 'Should be positive'
				};
			return _.fmap(fmtErrors, function (err, k) {
				return _.filter([err, rangeErrors[k]], _.identity).join(' ');
			});
		}
	};

	function settingsValid(errors) {
		return _.every(errors, function (s) { return !s; });
	}

	var scaleAnnotations = {
		float: {
			"max": "max: high color 100% saturation",
			"maxstart": "maxStart: high color 0% saturation",
			"minstart": "minStart: low color 0% saturation",
			"min": "min: low color 100% saturation"
		},
		segmented: {
			"origin": "Origin: value for copy number normal (typically: 0 or 2)",
			"thresh": "Threshold: absolute value from origin to start showing color",
			"max": "Saturation: absolute value to draw full color"
		}
	};
	var scaleDefaults = {
		float: {
			max: 1,
			maxstart: null,
			minstart: null,
			min: -1
		},
		segmented: {
			origin: 0,
			thresh: 0,
			max: 1
		}
	};

	class ScaleChoice extends React.Component {
	    constructor(props) {
	        super(props);
	        //check if there is custom value
	        let custom = colorParams[valueType].some(function (param) {
					if (getVizSettings(param)) {
						return true;
					}
				}),
				dataMin, dataMax;

	        if (valueType === "float") {
				dataMin = _.minnull(_.map(data.req.values, values => _.minnull(values)));
				dataMax = _.maxnull(_.map(data.req.values, values => _.maxnull(values)));
				scaleDefaults[valueType].min = dataMin;
				scaleDefaults[valueType].max = dataMax;
			} else if (valueType === 'segmented') {
				dataMin = _.minnull(_.map(data.req.rows, row => row.value));
				dataMax = _.maxnull(_.map(data.req.rows, row => row.value));
				if (dataMin >= 0) {
					scaleDefaults[valueType].origin = 2;
					scaleDefaults[valueType].max = 6;
				} else {
					scaleDefaults[valueType].origin = 0;
					scaleDefaults[valueType].max = dataMax;
				}
			}

	        this.state = {
				mode: custom ? "Custom" : "Auto",
				settings: custom ? _.pick(oldSettings, colorParams[valueType]) : scaleDefaults[valueType],
				errors: {}
			};
	    }

		componentWillMount() {
			let initStates = colorParams[valueType].map((colorParam) => _.valToStr(this.state.settings[colorParam]));
			this.setState(_.object(colorParams[valueType], initStates));
		}

	    autoClick = () => {
			this.setState({mode: "Auto"});
			this.setState({errors: {}});
			onVizSettings(id, _.omit(currentSettings.state, colorParams[valueType]));
		};

	    customClick = () => {
			this.setState({mode: "Custom"});
			onVizSettings(id, _.merge(currentSettings.state, getInputSettingsFloat(this.state.settings)));
		};

		handleChange = (name, value) => {
			var {settings} = this.state,
				newSettings = _.assoc(settings, name, value),
				errors = validateSettings[valueType](newSettings);
			this.setState({settings: newSettings,
				errors,
				[name]: value});

			if (settingsValid(errors)) {
				onVizSettings(id, _.merge(currentSettings.state, getInputSettingsFloat(newSettings)));
			}
		};

	    buildCustomColorScale = () => {
			var node = colorParams[valueType].map(param => {
					let label = scaleAnnotations[valueType][param],
						error = this.state.errors[param];

					return (
						<Row key={param}>
							<Col xs4={4} xs8={8} sm={6} smOffset={6}>
								<label className={vizSettingStyle.errorLabel}>{error}</label>
							</Col>
							<Col xs4={4} xs8={4} sm={6}>
								<div className={vizSettingStyle.inputLabel}>
									{label}
								</div>
							</Col>
							<Col xs4={4} xs8={4} sm={6}>
								<Input type='text'
									   value={this.state[param]}
									   className={vizSettingStyle.rangeInput}
									   hint={_.contains(['minThresh', 'maxThresh'], param) ? 'Auto' : ''}
									   onChange={this.handleChange.bind(this, param)}/>
							</Col>
						</Row>
					);
				});
			return node;
		};

	    render() {
			let mode = this.state.mode,
				autoMode = (this.state.mode === "Auto"),
				modes = ["Auto", "Custom"],
				funcMapping = {
					"Auto": this.autoClick,
					"Custom": this.customClick
				},
				buttons = modes.map(mode => {
					let active = (this.state.mode === mode),
						style = vizSettingStyle[active ? 'activeModeButton' : 'inactiveModeButton'],
						func = funcMapping[mode];
					return <Button key={mode} onMouseUp={func} className={style}>{mode}</Button>;
				}),
				enterInput = autoMode ? null : this.buildCustomColorScale(),
				autocolorTransformation = (valueType === "float" && fieldType !== 'clinical') ?
					<NormalizationDropDown /> :
					(valueType === 'segmented' ? <SegCNVnormalizationDropDown /> : null),
				notransformation = (
				    <Row>
						<Col xs4={4} xs8={3} sm={3}>Color transformation</Col>
						<Col xs4={4} xs8={5} sm={9}>no transformation</Col>
					</Row>
				),
				colorTransformation = autoMode ? autocolorTransformation : notransformation;

			return (
				<div>
					<Row>
						<Col xs4={4} xs8={3} sm={3}>
							<div className={vizSettingStyle.buttonGroupLabel}>
								Mode
							</div>
						</Col>
						<Col xs4={4} xs8={5} sm={9}>
							{buttons}
							<div>
								{enterInput}
							</div>
						</Col>
					</Row>
					<br/>
					{colorTransformation}
				</div>
			);
		}
	}

	function setVizSettings(key, value) {
		onVizSettings(id, _.assoc(currentSettings.state, key, value));
	}

	function getVizSettings(key) {
		return _.getIn(state, [key]);
	}

	//color transformation for dense genomics matrix floats
	class NormalizationDropDown extends React.Component {
	    constructor(props) {
	        super(props);
	        let	value = getVizSettings('colNormalization') || defaultNormalization || 'none',
				mapping = {
					"none": "none",
					"subset": "subset",
					"log2(x)": "log2(x)",
					true: "subset"
				};

	        this.state = {
				optionValue: mapping[value] || "none"
			};
	    }

	    handleChange = (value) => {
			var key = "colNormalization";
			setVizSettings(key, value);
			this.setState({optionValue: value});
		};

	    render() {
			let dataMin = _.minnull(_.map(data.req.values, values => _.minnull(values))),
				optionValue = this.state.optionValue,
				options = [
					{"key": "none", "label": "none"},
					{"key": "subset", "label": "center by column mean : x - column average"},
				];
			if (dataMin >= 0 && !(_.any(units, unit => unit && unit.search(/log/i) !== -1))) {
				// we allow log(0), necessary for RNAseq data, value =0 (no expression is very common).
				// display can handle this
				options.push({"key": "log2(x)", "label": "log scale : log2(x+1)"});
			}
			let normalizations = options.map((option) => ({
				value: option.key,
				label: option.label
			}));
			return (
				<Row>
					<Col xs4={4} xs8={3} sm={3}>
						<div className={vizSettingStyle.selectLabel}>
							Color transformation
						</div>
					</Col>
					<Col xs4={4} xs8={5} sm={9}>
						<Dropdown
							auto
							onChange={this.handleChange}
							source={normalizations}
							value={optionValue}
							className={vizSettingStyle.dropDown}
							theme={{
								selected: vizSettingStyle.selected
							}} />
					</Col>
				</Row>
			);
		}
	}

	//color transformation for segmented cnv
	class SegCNVnormalizationDropDown extends React.Component {
	    constructor(props) {
	        super(props);
	        let	value = getVizSettings('colNormalization') || defaultNormalization || 'none',
				mapping = {
					"none": "none",
					"normal2": "normal2",
				};

	        this.state = {
				optionValue: mapping[value] || "none"
			};
	    }

	    handleChange = (value) => {
			var key = "colNormalization";
			setVizSettings(key, value);
			this.setState({optionValue: value});
		};

	    render() {
			let optionValue = this.state.optionValue,
				options = [
					{"key": "none", "label": "normal = 0"},
					{"key": "normal2", "label": "normal = 2" },
				],
				normalizations = options.map((option) => ({
					value: option.key,
					label: option.label
				}));
			return (
				<Row>
					<Col xs4={4} xs8={3} sm={3}>
						<div className={vizSettingStyle.selectLabel}>
							Color transformation
						</div>
					</Col>
					<Col xs4={4} xs8={5} sm={9}>
						<Dropdown
							auto
							onChange={this.handleChange}
							source={normalizations}
							value={optionValue}
							className={vizSettingStyle.dropDown}
							theme={{
								selected: vizSettingStyle.selected
							}} />
					</Col>
				</Row>
			);
		}
	}

	//color palette dense matrix floats and segmented CNV
	class ColorDropDown extends React.Component {
	    constructor(props) {
	        super(props);
	        let	value = getVizSettings('colorClass') || 'default';

	        this.state = {
				optionValue: value
			};
	    }

		handleChange = (value) => {
			var key = "colorClass";
			setVizSettings(key, value);
			this.setState({optionValue: value});
		};

	    render() {
			let optionValue = this.state.optionValue,
				options = {
					float: [
						{"key": "default", "label": "red-white-blue"},
						{"key": "expression", "label": "red-black-green"},
						{"key": "blueBlackYellow", "label": "yellow-black-blue"},
						{"key": "whiteBlack", "label": "black-white"}
					],
					segmented: [
						{"key": "default", "label": "red-white-blue"},
						{"key": "expression", "label": "red-white-green"},
						{"key": "blueBlackYellow", "label": "yellow-white-blue"}
					],
				},
				colors = options[valueType].map((option) => ({
					value: option.key,
					label: option.label
				}));
			return (
				<Row>
					<Col xs4={4} xs8={3} sm={3}>
						<div className={vizSettingStyle.selectLabel}>
							Color palette
						</div>
					</Col>
					<Col xs4={4} xs8={5} sm={9}>
						<Dropdown
							auto
							onChange={this.handleChange}
							source={colors}
							value={optionValue}
							className={vizSettingStyle.dropDown}
							theme={{
								selected: vizSettingStyle.selected
							}} />
					</Col>
				</Row>
			);
		}
	}

	//color palette for SV
	class SvColorDropDown extends React.Component {
	    constructor(props) {
	        super(props);
	        let	value = getVizSettings('svColor') || 'default';

	        this.state = {
				optionValue: value
			};
	    }

		handleChange = (value) => {
			var key = "svColor";
			setVizSettings(key, value);
			this.setState({optionValue: value});
		};

	    render() {
			let optionValue = this.state.optionValue,
				options = {
					SV: [
						{"key": "default", "label": "grey"},
						{"key": "chromosomeGB", "label": "by chromosome (Genome Browser)"},
						{"key": "chromosomePCAWG", "label": "by chromosome (PCAWG)"},
					]
				},
				colors = options[fieldType].map((option) => ({
						value: option.key,
						label: option.label
					}));
			return (
				<Row>
					<Col xs4={4} xs8={3} sm={3}>
						<div className={vizSettingStyle.selectLabel}>
							Color palette
						</div>
					</Col>
					<Col xs4={4} xs8={5} sm={9}>
						<Dropdown
							auto
							onChange={this.handleChange}
							source={colors}
							value={optionValue}
							className={vizSettingStyle.dropDown}
							theme={{
								selected: vizSettingStyle.selected
							}} />
					</Col>
				</Row>
			);
		}
	}

	var oldSettings = state,
		currentSettings = {state: state},
		colorParams = {
			float: ["max", "maxstart", "minstart", "min"],
			segmented: ["origin", "thresh", "max"]
		};

	ReactDOM.render(React.createElement(DatasetSetting), node);
	return currentSettings;
}

// react wrapper for the legacy DOM code, above.
class SettingsWrapper extends React.Component {
	shouldComponentUpdate() {
		return false;
	}

	componentWillReceiveProps(newProps) {
		this.currentSettings.state = newProps.vizSettings;
	}

	componentDidMount() {
		var {refs: {content}, props: {data, units, onVizSettings, vizSettings, id, defaultNormalization, colorClass, valueType, fieldType, onRequestHide}} = this;
		this.currentSettings = vizSettingsWidget(content, onVizSettings, vizSettings, id, onRequestHide, defaultNormalization, colorClass, valueType, fieldType, data, units);
	}

	render() {
		return <div ref='content' />;
	}
}

class VizSettings extends React.Component {

	componentDidMount() {
		document.documentElement.scrollTop = 0;
		var body = document.getElementById("body");
		body.style.overflow = "auto";
	}

	render() {
		var {onRequestHide} = this.props;

		const actions = [
			{
				children: [<i className='material-icons'>close</i>],
				className: vizSettingStyle.dialogClose,
				onClick: onRequestHide
			},
		];

		return (
			<Dialog
				actions={actions}
				active={true}
				title='Dataset Visualization Settings'
				className={vizSettingStyle.dialog}
				onEscKeyDown={onRequestHide}
				onOverlayClick={onRequestHide}
				theme={{
					wrapper: vizSettingStyle.dialogWrapper,
					overlay: vizSettingStyle.dialogOverlay}}>
				<SettingsWrapper {...this.props} />
			</Dialog>
		);
	}
}

module.exports = VizSettings;
