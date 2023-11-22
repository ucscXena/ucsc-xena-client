import PureComponent from './PureComponent';
import {el} from './chart/react-hyper';
import DeckGL from '@deck.gl/react';
import {DataFilterExtension} from '@deck.gl/extensions';
import {BitmapLayer, /*ScatterplotLayer, */OrthographicView} from 'deck.gl';
import {scatterplotLayer} from './ScatterplotLayer';
import {COORDINATE_SYSTEM} from '@deck.gl/core';
import {TileLayer} from '@deck.gl/geo-layers';
import * as colorScales from './colorScales';
import {hasColor, isOrdinal, layerColors} from './models/map';
var {get, getIn, identity, Let} = require('./underscore_ext').default;

var deckGL = el(DeckGL);

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

var tileLayer = ({name, path, index, levels, opacity, size, tileSize, visible}) =>
	new TileLayer({
		id: `tile-layer-${index}`,
		data: `${path}/${name}-{z}-{y}-{x}.png`,
		minZoom: 0,
		maxZoom: levels - 1,
		tileSize,
		// extent appears to be in the dimensions of the lowest-resolution image.
		extent: [0, 0, size[0], size[1]],
		opacity: 1.0,
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
					opacity,
					image: props.data,
					bounds: [left, bottom, right, top]
				});
		}
	});


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

const dataLayer = (data, modelMatrix, colorBy, colorBy2, radius, onHover) =>
	Let((
		colorColumn = getIn(colorBy, ['field', 'mode']) &&
			getIn(colorBy, ['data', 'req', 'values', 0]),
		colorColumn2 = getIn(colorBy2, ['field', 'mode']) &&
			getIn(colorBy2, ['data', 'req', 'values', 0]),
		colors = getIn(colorBy, ['data', 'scale']),
		colors2 = getIn(colorBy2, ['data', 'scale']),
		hideColors = getIn(colorBy, ['hidden']),
		getColor = cvtColorScale(colorColumn, colors),
		getFilterValue = filterFn(colorColumn, hideColors)) => scatterplotLayer({

	id: `scatter-plot`,
	data: data[0],
	modelMatrix,
	getLineWidth: 50,
	pickable: true,
	onHover,
	// XXX see if we can switch to 'filled' when zoomed out & avoid
	// the over-large dot. We want radius to shrink to zero (or 1). Currently it
	// won't.
	getPosition: (d0, {index}) => [d0, data[1][index]],
	lineWidthMinPixels: 0,
	lineWidthMaxPixels: 3,
	getRadius: radius,
	// XXX just pass the array, instead of using an accessor here?
	getValues0: !colorColumn || isOrdinal(colors) ? null : (coords, {index}) => colorColumn[index],
	getValues1: colorColumn2 ? (coords, {index}) => colorColumn2[index] : null,
	...(isOrdinal(colors) ? {getColor} : {}),
	lower0: get(colors, 3),
	upper0: get(colors, 4),
	log0: get(colors, 0) === 'float-log',
	lower1: get(colors2, 3),
	upper1: get(colors2, 4),
	log1: get(colors2, 0) === 'float-log',
	updateTriggers: {getLineColor: [colorColumn, colors],
		getValues0: [colorColumn],
		getValues1: [colorColumn2],
		getFilterValue: [colorColumn, hideColors]},
	getFilterValue,
	filterRange: [1, 1],
	extensions: [new DataFilterExtension({filterSize: 1})]
}));

// scale and offset
var getM = (s, [x, y, z = 0]) => [
	s, 0, 0, 0,
	0, s, 0, 0,
	0, 0, s, 0,
	x, y, z, 1
];

var id = arr => arr.filter(identity);

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
	render() {
		if (!this.props.data.columns || !this.props.data.imageState) {
			return null;
		}
		var {props} = this,
			{columns: data, image, imageState, radius} = props.data,
			{image_scalef: scale, offset} = image,
			// TileLayer operates on the scale of the smallest downsample.
			// Adjust the scale here for the number of downsamples, so the data
			// overlay lines up.
			adj = (1 << imageState.levels - 1);

		var modelMatrix = getM(scale / adj, offset.map(c => c / adj));

		radius = radius * scale / adj;

		var layer0 = hasColor(props.data.color0) &&
			dataLayer(data, modelMatrix, get(props.data, 'color0'),
				get(props.data, 'color1'), radius, this.onHover);

		var views = new OrthographicView({far: -1, near: 1}),
			{inView, levels, size: [iwidth, iheight]} = imageState,
			{width, height} = props,
			viewState = {
				zoom: Math.log(Math.min(0.8 * width / iwidth, 0.8 * height / iheight)) / Math.LN2,
				minZoom: 0,
				maxZoom: levels + 1,
				target: [iwidth / 2, iheight / 2]
			};

		return deckGL({
				glOptions: {
					alpha: false
				},
				layers: id([
					imageState.background && tileLayer({
						name: 'i', path: image.path,
						// XXX rename opacity
						index: null, opacity: imageState.backgroundOpacity,
						levels: imageState.levels,
						size: imageState.size,
						tileSize: imageState.tileSize,
						visible: imageState.backgroundVisible
					}),
					...inView.map((c, i) =>
						tileLayer({
							name: `c${c}`, path: image.path,
							// XXX rename opacity
							index: i, opacity: imageState.opacity[c],
							levels: imageState.levels,
							size: imageState.size,
							tileSize: imageState.tileSize,
							visible: imageState.visible[i]})),
					layer0
				]),
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
			});
	}
}
