import PureComponent from './PureComponent';
import {div, el, span} from './chart/react-hyper';
import DeckGL from '@deck.gl/react';
import {DataFilterExtension} from '@deck.gl/extensions';
import {BitmapLayer, ScatterplotLayer, OrthographicView} from 'deck.gl';
import {COORDINATE_SYSTEM} from '@deck.gl/core';
import {TileLayer} from '@deck.gl/geo-layers';
import {Slider, Checkbox} from '@material-ui/core';
import * as colorScales from './colorScales';
var slider = el(Slider);
var {Let, pluck, sorted} = require('./underscore_ext').default;
import Autocomplete from '@material-ui/lab/Autocomplete';
import XAutosuggestInput from './views/XAutosuggestInput';
var xAutosuggestInput = el(XAutosuggestInput);
var autocomplete = el(Autocomplete);
import styles from './Img.module.css';

var {RGBToHex} = require('./color_helper').default;

var deckGL = el(DeckGL);
var checkbox = el(Checkbox);

var layerColors = [
	[0.0, 0.0, 1.0],
	[0.0, 1.0, 0.0],
	[1.0, 0.0, 0.0],
	[0.0, 1.0, 1.0],
	[1.0, 0.0, 1.0],
	[1.0, 1.0, 0.0],
];
var colorsCss = layerColors.map(c => RGBToHex(...c.map(v => v * 255)));

var fromGray = i =>
	`color.a = min(1., max(color.r - lower, 0.) / (upper - lower));
	color.r = ${layerColors[i % layerColors.length][0].toFixed(1)};
	color.g = ${layerColors[i % layerColors.length][1].toFixed(1)};
	color.b = ${layerColors[i % layerColors.length][2].toFixed(1)};`;

class XenaBitmapLayer extends BitmapLayer {
	getShaders() {
		return {
			...super.getShaders(),
			inject: {
				'fs:#decl': `uniform float lower; uniform float upper;`,
				'fs:DECKGL_FILTER_COLOR': fromGray(this.props.i)
			}
		};
	}
	updateState(params) {
		var {props, oldProps} = params;
		super.updateState(params);
		if (props.lower !== oldProps.lower) {
			this.state.model.setUniforms({lower: props.lower});
		}
		if (props.upper !== oldProps.upper) {
			this.state.model.setUniforms({upper: props.upper});
		}
	}
}

var channelSelect = ({channels, value, onChange}) =>
	autocomplete({
		onChange,
		disableClearable: true,
		options: channels,
		renderInput: props => xAutosuggestInput(props),
		className: styles.select,
		value
	});

var tileLayer = ({name, path, index, levels, opacity, size, tileSize, visible}) =>
	new TileLayer({
		id: `tile-layer-${index}`,
		data: `${path}/${name}-{z}-{y}-{x}.png`,
		minZoom: 0,
		maxZoom: levels - 1,
		tileSize,
		// extent appears to be in the dimensions of the lowest-resolution image.
		extent: [0, 0, size[0], size[1]],
		opacity: 1.0, // XXX no effect? It's mixed in before FILTER_COLOR???
		zoomOffset: 1,
		refinementStrategy: 'no-overlap',
		visible,
		// Have to include 'opacity' in props to force an update, because the
		// update algorithm doesn't see sublayer props.
		limits: opacity, // XXX does this do anything?
		renderSubLayers: props => {
			var {bbox: {left, top, right, bottom}} = props.tile;

			return index !== null ? new XenaBitmapLayer(props, {
					data: null,
					image: props.data,
					lower: opacity[0],
					upper: opacity[1],
					i: index,
					bounds: [left, bottom, right, top]
				}) : new BitmapLayer(props, {
					data: null,
					image: props.data,
					bounds: [left, bottom, right, top]
				});
		}
	});


// Adds 20% of range over and under the min/max of the dataset.
// The color scales will clamp the result to [0, 1].
var colorRange = ({min, max}) =>
	Let((over = (max - min) * 0.2) =>
		({min: (min - over) / 256, max: (max + over) / 256}));

var cvtColorScale = (colorColumn, colors) =>
	colorColumn ?
		Let((scale = colorScales.colorScale(colors)) =>
			(coords, {index}) => scale.rgb(colorColumn[index]))
	: () => [0, 255, 0];

var filterFn = (colorColumn, hideColors) =>
	colorColumn ?
		Let((hidden = new Set(hideColors || [])) =>
			(coords, {index}) => Let((v = colorColumn[index]) =>
				isNaN(v) || hidden.has(v) ? 0 : 1))
	: () => 1;

const dataLayer = (data, modelMatrix, color,
		radius, triggers, onHover, getFilterValue) => new ScatterplotLayer({
	id: `scatter-plot`,
	data: data[0],
	modelMatrix,
	stroked: true,
	getLineWidth: 50,
	filled: false,
	getPosition: (d0, {index}) => [d0, data[1][index]],
	lineWidthMinPixels: 2,
	lineWidthMaxPixels: 3,
	getRadius: radius,
	getLineColor: color,
	updateTriggers: {getLineColor: triggers, getFilterValue: triggers},
	pickable: true,
	onHover,
	getFilterValue,
	filterRange: [1, 1],
	extensions: [new DataFilterExtension({filterSize: 1})]
});

// scale and offset
var getM = (s, [x, y, z = 0]) => [
	s, 0, 0, 0,
	0, s, 0, 0,
	0, 0, s, 0,
	x, y, z, 1
];

export default class Img extends PureComponent {
	state = {}
	static defaultProps = {
		width: 800,
		height: 600
	}
	onHover = ev => {
		var i = ev.index;
		this.props.onTooltip(i < 0 ? null : i);
	}
	onOpacity = i => (ev, op) => {
		this.props.onOpacity(i, op);
	}
	onVisible = i => (ev, checked) => {
		this.props.onVisible(i, checked);
	}
	onChannel = i => (ev, channel) => {
		this.props.onChannel(i, channel);
	}
	render() {
		if (!this.props.data.columns) {
			return null;
		}

		var {colorColumn, hideColors, image, imageState, colors, columns,
				radius} = this.props.data,
			colorScale = cvtColorScale(colorColumn, colors),
			filter = filterFn(colorColumn, hideColors),
			{image_scalef: scale, offset} = image,
			// TileLayer operates on the scale of the smallest downsample.
			// Adjust the scale here for the number of downsamples, so the data
			// overlay lines up.
			adj = (1 << imageState.levels - 1);

		var modelMatrix = getM(scale / adj, offset.map(c => c / adj));

		radius = radius * scale / adj;

		var mergeLayer = dataLayer(columns, modelMatrix, colorScale, radius,
			[colorColumn, colors, hideColors], this.onHover, filter);
		var views = new OrthographicView({far: -1, near: 1}),
			{stats, inView, size: [iwidth, iheight]} = imageState,
			{width, height} = this.props,
			{onVisible} = this,
			viewState = {
				zoom: Math.log(Math.min(0.8 * width / iwidth, 0.8 * height / iheight)) / Math.LN2,
				minZoom: 1,
				maxZoom: 8,
				target: [iwidth / 2, iheight / 2]
			};

		return div({style: {display: 'flex', flexDirection: 'row-reverse'}},
			div({style: {position: 'relative', width, height,
					border: '3px solid black'}},
				deckGL({
					glOptions: {
						alpha: false
					},
					layers: [
						...(imageState.background ? [tileLayer({
							name: 'i', path: image.path,
							// XXX rename opacity
							index: null, opacity: 255,
							levels: imageState.levels,
							size: imageState.size,
							tileSize: imageState.tileSize,
							visible: true
						})] : []),
						...inView.map((c, i) =>
							tileLayer({
								name: `c${c}`, path: image.path,
								// XXX rename opacity
								index: i, opacity: imageState.opacity[c],
								levels: imageState.levels,
								size: imageState.size,
								tileSize: imageState.tileSize,
								visible: imageState.visible[i]})),
						...(colors ? [mergeLayer] : [])

					],
					views,
					controller: true,
					coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
					getCursor: () => 'inherit',
					initialViewState: {
						pitch: 0,
						bearing: 0,
						rotationX: 0,
						rotationOrbit: 0,
						...viewState
					},
					style: {backgroundColor: '#000000'}
				})),

			div({style: {width: 200, margin: 20, float: 'right'}},
			...inView.map((c, i) =>
				span(
					checkbox({checked: imageState.visible[i], style: {color: colorsCss[i % layerColors.length]}, onChange: onVisible(i)}),
					channelSelect({channels: sorted(pluck(stats, 'name')),
						value: stats[c].name, onChange: this.onChannel(i)}),
					slider({...colorRange(stats[c]), step: 0.001,
						value: imageState.opacity[c], onChange: this.onOpacity(c)})))));
	}
}
