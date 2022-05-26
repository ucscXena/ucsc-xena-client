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

var _ = require('../underscore_ext').default;
var React = require('react');
var ReactDOM = require('react-dom');
var {Row, Col} = require("react-material-responsive-grid");
import {
	Box,
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	Icon,
	IconButton,
	Input,
	MenuItem,
	MuiThemeProvider,
	TextField,
	Typography,
} from '@material-ui/core';
var {categoryMore} = require("../colorScales");
import {xenaColor} from '../xenaColor';
import {xenaTheme} from '../xenaTheme';

// Styles
import vizSettingStyle from './VizSettings.module.css';
var sxCloseButton = {
	alignSelf: 'flex-start',
	color: xenaColor.BLACK_38,
	'&:hover': {
		backgroundColor: xenaColor.BLACK_6,
	},
};
var sxModeTextField = {
	'& .MuiFormLabel-root.Mui-error': {
		color: xenaColor.WARNING,
	},
	'& .MuiFormHelperText-root.Mui-error': {
		color: xenaColor.WARNING,
	},
};

function vizSettingsWidget(node, onVizSettings, vizState, id, hide, defaultNormalization,
	defaultColorClass, valueType, fieldType, data, units, column) {

	class DatasetSetting extends React.Component {
		render() {
			let settingsContent =
				valueType === "float" || valueType === 'segmented' ? <AllFloat /> :
				valueType === "mutation" && fieldType === 'SV' ? <Sv /> :
				valueType === "coded" ? <Coded /> :
				<NoSettings />;
			return (
				<MuiThemeProvider theme={xenaTheme}>
					<DialogContent>
						{settingsContent}
					</DialogContent>
					<FinishButtonBar/>
				</MuiThemeProvider>
			);
		}
	}
	class AllFloat extends React.Component {
		render() {
			return (
				<Box sx={{display: 'flex', flexDirection: 'column', gap: 16}}>
					<ColorDropDown />
					<ScaleChoice />
				</Box>
			);
		}
	}
	class Sv extends React.Component {
		render() {
			return (
				<SvColorDropDown />
			);
		}
	}
	class Coded extends React.Component {
		render() {
			return (
				<CategoricalTable />
			);
		}
	}
	class NoSettings extends React.Component {
		render() {
			return (
				<DialogContentText>No setting adjustments available.</DialogContentText>
			);
		}
	}

	// discard user changes & close.
	class FinishButtonBar extends React.Component {
	    handleCancelClick = () => {
			hide();
			onVizSettings(id, oldSettings);
		};

	    handleDoneClick = () => {
			hide();
		};

	    render() {
			return (
				<DialogActions>
					<Button color='default' onMouseUp={this.handleCancelClick}>Cancel</Button>
					<Button onMouseUp={this.handleDoneClick}>Done</Button>
				</DialogActions>
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

		UNSAFE_componentWillMount() {//eslint-disable-line camelcase
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

		handleChange = (name, event) => {
			var value = event.target.value;
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
						<Box
							component={TextField}
							error={!!error}
							fullWidth
							helperText={error || undefined}
							key={param}
							label={label}
							size='small'
							type='text'
							value={this.state[param]}
							placeholder={_.contains(['minThresh', 'maxThresh'], param) ? 'Auto' : ''}
							sx={sxModeTextField}
							onChange={this.handleChange.bind(this, param)}/>
					);
				});
			return <Box mt={2} sx={{display: 'flex', flexDirection: 'column', gap: 4}}>{node}</Box>;
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
						style = vizSettingStyle[active ? 'activeModeButton' : undefined],
						func = funcMapping[mode];
					return <Button key={mode} onMouseUp={func} className={style}>{mode}</Button>;
				}),
				enterInput = autoMode ? null : this.buildCustomColorScale(),
				autocolorTransformation = (valueType === "float" && fieldType !== 'clinical') ?
					<NormalizationDropDown /> :
					(valueType === 'segmented' ? <SegCNVnormalizationDropDown /> : null),
				notransformation = (
				    <Row>
						<Col xs4={4} xs8={3} sm={3}>
							<div className={vizSettingStyle.selectLabel}>Color transformation</div>
						</Col>
						<Col xs4={4} xs8={5} sm={9}>
							<div className={vizSettingStyle.selectLabel}>no transformation</div>
						</Col>
					</Row>
				),
				colorTransformation = autoMode ? autocolorTransformation : notransformation;

			return (
				<>
					<Row>
						<Col xs4={4} xs8={3} sm={3}>
							<div className={vizSettingStyle.buttonGroupLabel}>
								Mode
							</div>
						</Col>
						<Col xs4={4} xs8={5} sm={9}>
							{buttons}
							{enterInput}
						</Col>
					</Row>
					{colorTransformation}
				</>
			);
		}
	}

	function setVizSettings(key, value) {
		onVizSettings(id, _.assoc(currentSettings.state, key, value));
	}

	function getVizSettings(key) {
		return _.getIn(state, [key]);
	}

	//standardized select options for select text field
	function renderSelectOptions(options) {
		return (
			options.map(({label, value}) => <MenuItem key={value} value={value}>{label}</MenuItem>)
		);
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

		handleChange = (event) => {
			var value = event.target.value;
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
						<TextField
							fullWidth
							onChange={this.handleChange}
							select
							value={optionValue}>
							{renderSelectOptions(normalizations)}
						</TextField>
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

		handleChange = (event) => {
			var value = event.target.value;
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
						<TextField
							fullWidth
							onChange={this.handleChange}
							select
							value={optionValue}>
							{renderSelectOptions(normalizations)}
						</TextField>
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

		handleChange = (event) => {
			var value = event.target.value;
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
						<TextField
							fullWidth
							onChange={this.handleChange}
							select
							value={optionValue}>
							{renderSelectOptions(colors)}
						</TextField>
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

		handleChange = (event) => {
			var value = event.target.value;
			var key = "svColor";
			setVizSettings(key, value);
			this.setState({optionValue: value});
		};

	    render() {
			let optionValue = this.state.optionValue,
				options = {
					SV: [
						{"key": "default", "label": "lavender"},
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
						<TextField
							fullWidth
							onChange={this.handleChange}
							select
							value={optionValue}>
							{renderSelectOptions(colors)}
						</TextField>
					</Col>
				</Row>
			);
		}
	}

	var parseVizSettingCodes = str => _.isString(str) && JSON.parse(str);

	//user label for Categories
	class CategoricalTable extends React.Component {
	    constructor(props) {
	        super(props);
	        this.state = parseVizSettingCodes(getVizSettings('codes')) ||
				_.object(_.range(data.codes.length), data.codes);
	    }

		handleChange = (i, event) => {
			var value = event.target.value;
			let codes = this.state;

			codes[i] = value;
			setVizSettings('codes', JSON.stringify(codes));
			this.setState({[i]: value});
		};

		onRest = (i, originalCode) => {
			let codes = this.state,
				value = originalCode;

			codes[i] = value;
			setVizSettings('codes', JSON.stringify(codes));
			this.setState({[i]: value});
		};


		buildCoded = (index, codes, originalCodes, customColors) => {
			var node = index.map((i) => {
				let code = codes[i.toString()],
					originalCode = originalCodes[i],
					backgroundColor = customColors ?  customColors[i] : categoryMore[i % categoryMore.length];

				return (
					<Row key={i}>
						<Col xs4={1} xs8={1} sm={1}>
						    <Box bgcolor={backgroundColor} sx={{height: 20, marginTop: 8, width: 20}}/>
						</Col>
						<Col xs4={4} xs8={4} sm={6}>
							<Input fullWidth onChange={this.handleChange.bind(this, i)} type='text' value={code}/>
						</Col>
						{code !== originalCode ?
							<Col>
								<Button onMouseUp={this.onRest.bind(this, i, originalCode)}>Reset</Button>
							</Col> : null}
					</Row>
				);
			});
			return node;
		};

	    render() {
			let customColors = _.getIn(column, ['colors', 0, 2]),
				codes = this.state,
				originalCodes = _.getIn(data, ['codes']),
				index = _.intersection(_.getIn(data, ['req', 'values', 0]), _.range(data.codes.length));

			index.sort(function sortNumber(a, b) {return a - b;}).reverse();

			return (
				<Box sx={{display: 'flex', flexDirection: 'column', gap: 8}}>
					<Row>
						<Col xs4={1} xs8={1} sm={1}>
							<div className={vizSettingStyle.selectLabel}>
								Color
							</div>
						</Col>
						<Col xs4={4} xs8={4} sm={6}>
							<div className={vizSettingStyle.selectLabel}>
								Label
							</div>
						</Col>
					</Row>
					{this.buildCoded(index, codes, originalCodes, customColors)}
				</Box>
			);
		}
	}

	var state = vizState,
		oldSettings = state,
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

	UNSAFE_componentWillReceiveProps(newProps) {//eslint-disable-line camelcase
		this.currentSettings.state = newProps.vizSettings;
	}

	componentDidMount() {
		var {refs: {content}, props: {data, column, units, onVizSettings, vizSettings, id,
			defaultNormalization, colorClass, valueType, fieldType, onRequestHide}} = this;

		this.currentSettings = vizSettingsWidget(content, onVizSettings, vizSettings, id, onRequestHide, defaultNormalization,
			colorClass, valueType, fieldType, data, units, column);
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

		return (
			<Dialog
				BackdropProps={{style: {top: 64}}}
				className={vizSettingStyle.dialog}
				fullWidth
				maxWidth={'sm'}
				onClose={onRequestHide}
				open={true}
				PaperProps={{style: {alignSelf: 'flex-start'}}}>
				<DialogTitle disableTypography>
					<Box sx={{display: 'flex', gap: 8, justifyContent: 'space-between'}}>
						<Typography variant='subtitle1'>Adjust Display Settings</Typography>
						<Box color='default' component={IconButton} onClick={onRequestHide} sx={sxCloseButton}>
							<Icon>close</Icon>
						</Box>
					</Box>
				</DialogTitle>
				<SettingsWrapper {...this.props} />
			</Dialog>
		);
	}
}

module.exports = VizSettings;
