import PureComponent from '../PureComponent';
import {Slider, Checkbox, FormControlLabel} from '@material-ui/core';
import {div, el, span} from '../chart/react-hyper';
import Autocomplete from '@material-ui/lab/Autocomplete';
import XAutosuggestInput from '../views/XAutosuggestInput';
var {getIn, Let, pluck, sorted} = require('../underscore_ext').default;
import styles from './ImgControls.module.css';
import {hasImage, layerColors} from '../models/map';
var {RGBToHex} = require('../color_helper').default;

var autocomplete = el(Autocomplete);
var formControlLabel = el(FormControlLabel);
var slider = el(Slider);
var checkbox = el(Checkbox);
var xAutosuggestInput = el(XAutosuggestInput);

var colorsCss = layerColors.map(c => RGBToHex(...c.map(v => v * 255)));

// Adds 20% of range over and under the min/max of the dataset.
// The color scales will clamp the result to [0, 1].
var colorRange = ({min, max}) =>
	Let((over = (max - min) * 0.2) =>
		({min: (min - over) / 256, max: (max + over) / 256}));


var channelSelect = ({channels, value, onChange}) =>
	autocomplete({
		onChange,
		disableClearable: true,
		options: channels,
		renderInput: props => xAutosuggestInput(props),
		className: styles.select,
		value
	});

export default class ImgControls extends PureComponent {
	onOpacity = i => (ev, op) => {
		this.props.onOpacity(i, op);
	}
	onVisible = i => (ev, checked) => {
		this.props.onVisible(i, checked);
	}
	onChannel = i => (ev, channel) => {
		this.props.onChannel(i, channel);
	}
	onBackgroundVisible = (ev, checked) => {
		this.props.onBackgroundVisible(checked);
	}
	onBackgroundOpacity = (ev, op) => {
		this.props.onBackgroundOpacity(op);
	}
	render() {
		var {state} = this.props;
		var image = hasImage(state),
			imageState = image && getIn(state, ['image', image.path]);
		if (!imageState) {
			return null;
		}

		var {stats, inView, background, backgroundVisible,
				backgroundOpacity} = imageState,
			{onVisible, onBackgroundVisible, onBackgroundOpacity} = this;
		return div(
			...(background ?
				[span(

					formControlLabel({label: "H&E",
						control: checkbox({checked: backgroundVisible,
							onChange: onBackgroundVisible})}),
					slider({min: 0, max: 1, step: 0.001, value: backgroundOpacity,
						valueLabelDisplay: 'auto', onChange: onBackgroundOpacity}))] :
				[]),
			...inView.map((c, i) =>
				span(
					checkbox({checked: imageState.visible[i], style: {color: colorsCss[i % layerColors.length]}, onChange: onVisible(i)}),
					channelSelect({channels: sorted(pluck(stats, 'name')),
						value: stats[c].name, onChange: this.onChannel(i)}),
					slider({...colorRange(stats[c]), step: 0.001,
						valueLabelDisplay: 'auto', value: imageState.opacity[c],
						onChange: this.onOpacity(c)}))));
	}
}
