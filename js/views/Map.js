import {Icon, IconButton} from '@material-ui/core';
import PureComponent from '../PureComponent';
import styles from './Map.module.css';
import {div, el, img, span} from '../chart/react-hyper.js';
var _ = require('../underscore_ext').default;
import * as colorScales from '../colorScales';
import spinner from '../ajax-loader.gif';
import {OrbitView, OrthographicView} from 'deck.gl';
import {pointCloudLayer} from '../PointCloudLayer';
import DeckGL from '@deck.gl/react';
import {DataFilterExtension} from '@deck.gl/extensions';
import {debounce} from '../rx';

import AxesLayer from './axes-layer';

import {COORDINATE_SYSTEM} from '@deck.gl/core';
import {colorError, colorLoading, dataError, dataLoading, getData,
	getRadius, hasImage, isOrdinal} from '../models/map';
import Img from '../Img';

var iconButton = el(IconButton);
var icon = el(Icon);

// Styles

// https://gamedev.stackexchange.com/questions/53601/why-is-90-horz-60-vert-the-default-fps-field-of-view
//var perspective = 60;

var deckGL = el(DeckGL);

var filterFn = (colorColumn, hideColors) =>
	colorColumn ?
		_.Let((hidden = new Set(hideColors || [])) =>
			(coords, {index}) => _.Let((v = colorColumn[index]) =>
				isNaN(v) || hidden.has(v) ? 0 : 1))
	: () => 1;

var cvtColorScale = (colorColumn, colors) =>
	colorColumn ?
		_.Let((scale = colorScales.colorScale(colors)) =>
			(coords, {index}) => scale.rgb(colorColumn[index]))
	: () => [0, 255, 0];

const dataLayer = (data, modelMatrix, colorBy, colorBy2, radius, onHover) =>
	_.Let((
		colorColumn = _.getIn(colorBy, ['field', 'mode']) &&
			_.getIn(colorBy, ['data', 'req', 'values', 0]),
		colorColumn2 = _.getIn(colorBy2, ['field', 'mode']) &&
			_.getIn(colorBy2, ['data', 'req', 'values', 0]),
		colors = _.getIn(colorBy, ['data', 'scale']),
		colors2 = _.getIn(colorBy2, ['data', 'scale']),
		hideColors = _.getIn(colorBy, ['hidden']),
		getColor = cvtColorScale(colorColumn, colors),
		getFilterValue = filterFn(colorColumn, hideColors)) => pointCloudLayer({

	id: 'scatter',
	coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
	parameters: {depthTest: isOrdinal(colors)},
	sizeUnits: 'common',
	modelMatrix,
	material: false,
	getNormal: [1, 1, 1], // XXX deprecated?
	pickable: true,
	onHover,
	// XXX optimize this, either passing in the typed array, or using
	// deckgl's transient return buffer. See deckgl optimization docs.
	getPosition: data.length === 2 ?
		(d0, {index}) => [d0, data[1][index]] :
		(d0, {index}) => [d0, data[1][index], data[2][index]],
	pointSize: radius,
	// Our data is transposed vs. what deck expects, so we just pass the first
	// coord & use accessors to return the other coords.
	data: data[0],

	// XXX just pass the array, instead of using an accessor here?
	getValues0: !colorColumn || isOrdinal(colors) ? null : (coords, {index}) => colorColumn[index],
	getValues1: colorColumn2 ? (coords, {index}) => colorColumn2[index] : null,
	...(isOrdinal(colors) ? {getColor} : {}),
	lower0: _.get(colors, 3),
	upper0: _.get(colors, 4),
	log0: _.get(colors, 0) === 'float-log',
	lower1: _.get(colors2, 3),
	upper1: _.get(colors2, 4),
	log1: _.get(colors2, 0) === 'float-log',
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

var id = arr => arr.filter(_.identity);

var initialZoom = props => {
	var {width, height} = props.container.getBoundingClientRect();

	return Math.log2(Math.min(0.8 * width / cubeWidth, 0.8 * height / cubeWidth));
};

var currentScale = (zoom, scale) => Math.pow(2, -zoom) / scale;

class MapDrawing extends PureComponent {
	onHover = ev => {
		var i = ev.index;
		this.props.onTooltip(i < 0 ? null : i);
	}
	onZoom = debounce(400, this.props.onZoom);
	componentDidMount() {
		if (this.props.data.columns.length  !== 2) {
			return;
		}
		var zoom = initialZoom(this.props),
			{data: {columns}} = this.props,
			mins = columns.map(_.minnull),
			maxs = columns.map(_.maxnull),
			bounds = maxs.map((max, i) => max - mins[i]),
			scale = cubeWidth / Math.max(...bounds);
		this.props.onZoom(currentScale(zoom, scale));
	}
	render() {
		var {props} = this;
		var twoD = props.data.columns.length === 2;
		var mins = props.data.columns.map(_.minnull),
			maxs = props.data.columns.map(_.maxnull),
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
				target: _.Let((c = cubeWidth / 2) => [c, c, 0])
			};
		} else {
			views = new OrbitView();
			viewState = {
				zoom: 4,
				minZoom: 2,
				maxZoom: 12,
				target: _.Let((c = cubeWidth / 2) => [c, c, c])
			};
		}

		var layer0 = dataLayer(data, modelMatrix, _.get(props.data, 'color0'),
					_.get(props.data, 'color1'), radius * scale, this.onHover);

		return deckGL({
			ref: this.props.onDeck,
			layers: id([!twoD && axesLayer(), layer0]),
			onViewStateChange: twoD ? e => {
				this.onZoom(currentScale(e.viewState.zoom, scale));
			} : undefined,
			views,
			controller: true,
			coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
			getCursor: () => 'inherit',
			initialViewState: {
				pitch: 0,
				bearing: 0,
				rotationX: 45,
				rotationOrbit: 45,
				...viewState
			},
			style: {backgroundColor: '#FFFFFF'}
		});
	}
}

var mapDrawing = props =>
	!props.data.columns || !props.container ? null :
	el(MapDrawing)(props);

var imgDrawing = el(Img);

//var nbsp = '\u00A0';
//class SideBar extends PureComponent {
//	render() {
//		var {tooltip, state} = this.props,
//			id = getColorColumn(state),
//			column = null, //state.columns[id],
//			data = _.getIn(state, ['data', id]);
//
//		return div({className: styles.sideBar, onClick: this.onClick},
//			colorSelector(state, this.onColor),
//			p(tooltip ? `Sample ${tooltip.sampleID}` : nbsp),
//			p(tooltip && tooltip.valTxt ? `Value: ${tooltip.valTxt}` : nbsp),
//			column ? p({className: styles.actions},
//				button({color: 'default', disableElevation: true, onClick: this.props.onHideAll, variant: 'contained'}, 'Hide all'),
//				button({color: 'default', disableElevation: true, onClick: this.props.onShowAll, variant: 'contained'}, 'Show all')) : null,
//			column ? div({className: styles.legend},
//				widgets.legend({column, data, clickable: true})) : null);
//	}
//}

var getStatusView = (loading, error, onReload) =>
	loading ? div({className: styles.status},
				img({style: {textAlign: 'center'}, src: spinner})) :
		// XXX this is broken
	error ? div({className: styles.status},
				iconButton({
						onClick: onReload,
						title: 'Error loading data. Click to reload.',
						ariaHidden: 'true'},
					icon('warning'))) :
	null;

var scale = onRef =>
		div({className: styles.scale, ref: onRef},
			span(), span(), span(), span());

export class Map extends PureComponent {
	state = {
		tooltip: null
	}
	componentDidMount() {
		this.timer = setInterval(() => {
			if (this.FPSRef && this.deckGL) {
				this.FPSRef.innerHTML = `${this.deckGL.deck.metrics.fps.toFixed(0)} FPS`;
			}
		}, 1000);
	}
	componentWillUnmount() {
		clearTimeout(this.timer);
	}
	onFPSRef = FPSRef => {
		this.FPSRef = FPSRef;
	}
	onDeck = deckGL => {
		this.deckGL = deckGL;
	}
//	onHideAll = () => {
//		var {state} = this.props,
//			colorId = state.map.colorColumn,
//			count = state.data[colorId].codes.length;
//		this.props.callback(['map-hide-codes', _.range(count)]);
//	}
//	onShowAll = () => {
//		this.props.callback(['map-hide-codes', []]);
//	}
//	onReload = () => {
//		this.props.callback(['map', true]);
//	}
	onRef = ref => {
		if (ref) {
			this.setState({container: ref});
		}
	}
	onScaleRef = ref => {
		if (ref) {
			this.setState({scale: ref});
		}
	}
	onZoom = upp => {
		var unit = _.getIn(this.props.state, ['dataset', 'micrometer_per_unit']);
		if (unit && this.state.scale) {
			this.state.scale.children[3].innerHTML =
				// scale is 100px wide in css
				`${(100 * upp * unit).toFixed(0)} \u03BCm`;
		}
	}
	render() {
		var handlers = _.pick(this.props, (v, k) => k.startsWith('on'));

		var {onZoom, onDeck} = this,
			mapState = this.props.state,
			params = _.get(mapState, 'dataset', []),
			mapData = getData(mapState),
			color0 = _.get(mapState, 'colorBy'),
			color1 = _.get(mapState, 'colorBy2'),
			loading = dataLoading(mapState) || colorLoading(mapState),
			error = dataError(mapState) || colorError(mapState),
			columns = _.getIn(mapData, ['req', 'values']),
			view = mapState.view,
			labels = _.get(params, 'dimension', []),
			radius = getRadius(mapState),
			image = hasImage(mapState),
			imageState = image && _.getIn(mapState, ['image', image.path]),
			data = {columns, radius, color0, color1,
				labels, view, image, imageState},
			unit = _.get(params, 'micrometer_per_unit'),
			drawing = image ? imgDrawing : mapDrawing,
			{container} = this.state;

		return div({className: styles.content},
				span({className: styles.fps, ref: this.onFPSRef}),
				div({className: styles.graphWrapper, ref: this.onRef},
					...(unit ? [scale(this.onScaleRef)] : []),
					getStatusView(loading, error, this.onReload),
					drawing({...handlers, onZoom, onDeck, data, container})));
	}
}
