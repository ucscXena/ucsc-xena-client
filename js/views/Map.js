import {Icon, IconButton} from '@material-ui/core';
import PureComponent from '../PureComponent';
import styles from './Map.module.css';
import {br, div, el, img, span} from '../chart/react-hyper.js';
var {get, getIn, identity, Let, max, min,
	pick, pluck} = require('../underscore_ext').default;
import * as colorScales from '../colorScales';
import spinner from '../ajax-loader.gif';
import {OrbitView, OrthographicView} from 'deck.gl';
import {pointCloudLayer} from '../PointCloudLayer';
import DeckGL from '@deck.gl/react';
import {DataFilterExtension} from '@deck.gl/extensions';
import {debounce} from '../rx';
import highlightLayer from './highlightLayer';

import AxesLayer from './axes-layer';

import {COORDINATE_SYSTEM} from '@deck.gl/core';
import {colorError, colorLoading, dataError, dataLoading, getData,
	getRadius, getSamples, hasColor, hasImage, isOrdinal} from '../models/map';
import Img from '../Img';

var iconButton = el(IconButton);
var icon = el(Icon);

// Styles

// https://gamedev.stackexchange.com/questions/53601/why-is-90-horz-60-vert-the-default-fps-field-of-view
//var perspective = 60;

var deckGL = el(DeckGL);

var filterFn = (colorColumn, hideColors) =>
	colorColumn ?
		Let((hidden = new Set(hideColors || [])) =>
			(coords, {index}) => Let((v = colorColumn[index]) =>
				isNaN(v) || hidden.has(v) ? 0 : 1))
	: () => 1;

var cvtColorScale = (colorColumn, colors) =>
	colorColumn ?
		Let((scale = colorScales.colorScale(colors)) =>
			(coords, {index}) => scale.rgb(colorColumn[index]))
	: () => [0, 255, 0];

// Adding a small random z coordinate for 2d prevents data occlusion
// due to rendering order, i.e. last rendered wins, so if one category
// is clustered at the end, it dominates the view.
var randZ = () => Math.random() * 0.0001;

const dataLayer = (data, modelMatrix, colorBy, colorBy2, radius, radiusMin,
                   minTransparent1) =>
	Let((
		colorColumn = getIn(colorBy, ['field', 'mode']) &&
			getIn(colorBy, ['data', 'req', 'values', 0]),
		colorColumn2 = getIn(colorBy2, ['field', 'mode']) &&
			getIn(colorBy2, ['data', 'req', 'values', 0]),
		colors = getIn(colorBy, ['data', 'scale']),
		colors2 = getIn(colorBy2, ['data', 'scale']),
		hideColors = getIn(colorBy, ['hidden']),
		getColor = cvtColorScale(colorColumn, colors),
		getFilterValue = filterFn(colorColumn, hideColors)) => pointCloudLayer({

	id: `scatter-${radiusMin}`,
	coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
	parameters: {depthTest: isOrdinal(colors) && !colors2},
	sizeUnits: 'common',
	modelMatrix,
	material: false,
	getNormal: [1, 1, 1], // XXX deprecated?
	pickable: true,
	// XXX optimize this, either passing in the typed array, or using
	// deckgl's transient return buffer. See deckgl optimization docs.
	getPosition: data.length === 2 ?
		(d0, {index}) => [d0, data[1][index], randZ()] :
		(d0, {index}) => [d0, data[1][index], data[2][index]],
	pointSize: radius,
	radiusMin,
	// Our data is transposed vs. what deck expects, so we just pass the first
	// coord & use accessors to return the other coords.
	data: data[0],

	// XXX just pass the array, instead of using an accessor here?
	getValues0: !colorColumn || isOrdinal(colors) ? null : (coords, {index}) => colorColumn[index],
	getValues1: colorColumn2 ? (coords, {index}) => colorColumn2[index] : null,
	...(isOrdinal(colors) ? {getColor} : {}),
	lower0: get(colors, 3),
	upper0: get(colors, 4),
	log0: get(colors, 0) === 'float-log',
	minTransparent1,
	lower1: get(colors2, 3),
	upper1: get(colors2, 4),
	log1: get(colors2, 0) === 'float-log',
	updateTriggers: {getColor: [colorColumn, colors],
		getValues0: [colorColumn],
		getValues1: [colorColumn2],
		getFilterValue: [colorColumn, hideColors]},
	getFilterValue,
	filterRange: [1, 1],
	extensions: [new DataFilterExtension({filterSize: 1})]
}));

var cubeWidth = 20; // fit data to cube of this dimension

// scale and offset
var getM = (s, [x, y, z = 0]) => [
	s, 0, 0, 0,
	0, s, 0, 0,
	0, 0, s, 0,
	x, y, z, 1
];

// Target dot radius for max zoom, assuming a roughly uniform
// spatial distribution of data.
var maxDotRadius = 100;

var id = arr => arr.filter(identity);

var initialZoom = props => {
	var {width, height} = props.container.getBoundingClientRect();

	return Math.log2(Math.min(0.8 * width / cubeWidth, 0.8 * height / cubeWidth));
};

var currentScale = (zoom, scale) => Math.pow(2, -zoom) / scale;

class MapDrawing extends PureComponent {
	onTooltip = ev => {
		this.props.onTooltip(ev.index);
	}
	onViewState = debounce(400, this.props.onViewState);
	componentDidMount() {
		if (this.props.data.columns.length  !== 2) {
			return;
		}
		var zoom = get(this.props.data.viewState, 'zoom', initialZoom(this.props)),
			{data: {columns}} = this.props,
			mins = columns.map(min),
			maxs = columns.map(max),
			bounds = maxs.map((max, i) => max - mins[i]),
			scale = cubeWidth / Math.max(...bounds);
		this.props.onViewState(null, currentScale(zoom, scale));
	}
	render() {
		var {props} = this;
		var {tooltip} = props;
		var twoD = props.data.columns.length === 2;
		var mins = props.data.columns.map(min),
			maxs = props.data.columns.map(max),
			centroids = maxs.map((max, i) => (max + mins[i]) / 2);

		var data = this.props.data.columns;
		var {radius} = this.props.data;
		var bounds = maxs.map((max, i) => max - mins[i]);
		var scale = cubeWidth / Math.max(...bounds);
		var offset = centroids.map(c => cubeWidth / 2 - scale * c);
		var modelMatrix = getM(scale, offset);
		// XXX write a better AxesLayer
		var axesScale = x => x;
		axesScale.range = () => [0, cubeWidth];
		axesScale.ticks = () => [0, cubeWidth / 2, cubeWidth];
		var axesLayer = () => new AxesLayer({
			xScale: axesScale,
			yScale: axesScale,
			zScale: axesScale,
			padding: 0
		});
		var views, viewState;
		if (twoD) {
			var maxZoom =
				Math.log2(maxDotRadius / cubeWidth * Math.sqrt(data[0].length));
			// z is zero, so set far and near around it.
			views = new OrthographicView({far: -1, near: 1});
			viewState = {
				zoom: initialZoom(props),
				minZoom: 2,
				maxZoom,
				target: Let((c = cubeWidth / 2) => [c, c, 0])
			};
		} else {
			views = new OrbitView({});
			viewState = {
				zoom: 5,
				minZoom: 2,
				maxZoom: 12,
				target: Let((c = cubeWidth / 2) => [c, c, c])
			};
		}

		var layer0 = dataLayer(data, modelMatrix, get(props.data, 'color0'),
		                       get(props.data, 'color1'), radius * scale,
		                       twoD ? 1 : 2, props.minT);

		return deckGL({
			ref: this.props.onDeck,
			layers: id([!twoD && axesLayer(),
				layer0,
				tooltip < 0 ? null :
					highlightLayer({data: [pluck(data, tooltip)], modelMatrix,
					                radius: radius * scale})
			]),
			onViewStateChange: ({viewState}) => {
				this.onViewState(viewState,
					twoD && currentScale(viewState.zoom, scale));
			},
			views,
			controller: true,
			coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
			getCursor: () => 'inherit',
			initialViewState: props.data.viewState || {
				rotationX: 45,
				rotationOrbit: 45,
				...viewState
			},
			onClick: this.onTooltip,
			style: {backgroundColor: '#FFFFFF'}
		});
	}
}

var mapDrawing = props =>
	!props.data.columns || !props.container ? null :
	el(MapDrawing)(props);

var imgDrawing = el(Img);

var getStatusView = el(({loading, error, onReload}) =>
	loading ? div({className: styles.status},
				img({style: {textAlign: 'center'}, src: spinner})) :
		// XXX this is broken
	error ? div({className: styles.status},
				iconButton({
						onClick: onReload,
						title: 'Error loading data. Click to reload.',
						ariaHidden: 'true'},
					icon('warning'))) :
	null);

var scale = um =>
	div({className: styles.scale},
		span(), span(), span(), span(`${um == null ? '-' : um.toFixed()} \u03BCm`));

var getColorTxt = (state, i) =>
	hasColor(state) ?
		Let((value = getIn(state, ['data', 'req', 'values', 0, i])) =>
			getIn(state, ['data', 'codes', value], String(value))) :
		'';

var tooltipView = (state, i, onClick) =>
	Let((sampleID = getSamples(state)[i],
		valTxt0 = getColorTxt(get(state, 'colorBy'), i),
		valTxt1 = getColorTxt(get(state, 'colorBy2'), i)) =>
	div({className: styles.tooltip},
	    span(sampleID, icon({onClick}, 'close')), br(), valTxt0, br(), valTxt1));

export class Map extends PureComponent {
	state = {
		tooltip: -1,
		scale: null
	}
	//	For displaying FPS
//	componentDidMount() {
//		this.timer = setInterval(() => {
//			if (this.FPSRef && this.deckGL) {
//				this.FPSRef.innerHTML = `${this.deckGL.deck.metrics.fps.toFixed(0)} FPS`;
//			}
//		}, 1000);
//	}
//	componentWillUnmount() {
//		clearTimeout(this.timer);
//	}
	onFPSRef = FPSRef => {
		this.FPSRef = FPSRef;
	}
	onDeck = deckGL => {
		this.deckGL = deckGL;
	}
	onRef = ref => {
		if (ref) {
			this.setState({container: ref});
		}
	}
	onViewState = (viewState, upp) => {
		var unit = getIn(this.props.state, ['dataset', 'micrometer_per_unit']);
		if (upp && unit) {
			this.setState({scale: 100 * upp * unit});
		} else {
			this.setState({scale: null});
		}
		if (viewState) {
			this.props.onViewState(viewState);
		}
	}
	onTooltip = tooltip => {
		this.setState({tooltip});
	}
	onClose = () => {
		this.setState({tooltip: -1});
	}
	render() {
		var handlers = pick(this.props, (v, k) => k.startsWith('on'));

		var {onViewState, onTooltip, onClose, onDeck, onReload} = this,
			mapState = this.props.state,
			{minT} = this.props,
			params = get(mapState, 'dataset', []),
			mapData = getData(mapState),
			color0 = get(mapState, 'colorBy'),
			color1 = get(mapState, 'colorBy2'),
			columns = getIn(mapData, ['req', 'values']),
			{viewState} = mapState,
			labels = get(params, 'dimension', []),
			radius = getRadius(mapState),
			image = hasImage(mapState),
			imageState = image && getIn(mapState, ['image', image.path]),
			// If we have an image, show data loading only if we already have a color.
			// Otherwise data is loading in background & doesn't affect the user.
			loading = dataLoading(mapState) && !image || colorLoading(mapState),
			error = dataError(mapState) || colorError(mapState),
			data = {columns, radius, color0, color1,
				labels, viewState, image, imageState},
			unit = get(params, 'micrometer_per_unit'),
			drawing = image ? imgDrawing : mapDrawing,
			{container, tooltip} = this.state;

		return div({className: styles.content},
				span({className: styles.fps, ref: this.onFPSRef}),
				div({className: styles.graphWrapper, ref: this.onRef},
					...(unit ? [scale(this.state.scale)] : []),
					...(tooltip >= 0 ? [tooltipView(mapState, tooltip, onClose)] : []),
					getStatusView({loading, error, onReload, key: 'status'}),
					drawing({...handlers, minT, onViewState, onDeck, onTooltip,
					        tooltip, data, container, key: 'drawing'})));
	}
}
