import {/*Button, */Icon, IconButton} from '@material-ui/core';
import PureComponent from '../PureComponent';
import styles from './Map.module.css';
import {div, el, img} from '../chart/react-hyper.js';
var _ = require('../underscore_ext').default;
import * as colorScales from '../colorScales';
import spinner from '../ajax-loader.gif';
import {PointCloudLayer, OrbitView, OrthographicView} from 'deck.gl';
import DeckGL from '@deck.gl/react';
import {DataFilterExtension} from '@deck.gl/extensions';

import AxesLayer from './axes-layer';

import {COORDINATE_SYSTEM} from '@deck.gl/core';
import {colorError, colorLoading, dataError, dataLoading, getData,
	getRadius, hasImage} from '../models/map';
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

const dataLayer = (data, modelMatrix, color, radius, depthTest, triggers, onHover,
		getFilterValue) => new PointCloudLayer({
	id: 'scatter',
	coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
	parameters: {depthTest},
	sizeUnits: 'common',
	// Our data is transposed vs. what deck expects, so we just pass the first
	// coord & use accessors to return the other coords.
	data: data[0],
	modelMatrix,
	material: false,
	// XXX optimize this, either passing in the typed array, or using
	// deckgl's transient return buffer. See deckgl optimization docs.
	getPosition: data.length === 2 ?
		(d0, {index}) => [d0, data[1][index]] :
		(d0, {index}) => [d0, data[1][index], data[2][index]],
	pointSize: radius,
	getColor: color,
	// XXX not sure if updateTriggers is necessary. The accessor functions
	// that depend on these should already compare not-equal.
	updateTriggers: {getColor: triggers, getFilterValue: triggers},
	getNormal: [1, 1, 1],
	pickable: true,
	onHover,
	getFilterValue,
	filterRange: [1, 1],
	extensions: [new DataFilterExtension({filterSize: 1})]
});

var cvtColorScale = (colorColumn, colors) =>
	colorColumn ?
		_.Let((scale = colorScales.colorScale(colors)) =>
			(coords, {index}) => scale.rgb(colorColumn[index]))
	: () => [0, 255, 0];

var isOrdinal = colors => colors && colors[0] === 'ordinal';


var cubeWidth = 20; // fit data to cube of this dimension


// scale and offset
var getM = (s, [x, y, z = 0]) => [
	s, 0, 0, 0,
	0, s, 0, 0,
	0, 0, s, 0,
	x, y, z, 1
];

class MapDrawing extends PureComponent {
	onHover = ev => {
		var i = ev.index;
		this.props.onTooltip(i < 0 ? null : i);
	}
	render() {
		var {props} = this;
		if (!props.data.columns) {
			return null;
		}
		if (!this.props.container) {
			return null;
		}
		var twoD = props.data.columns.length === 2;
		var mins = props.data.columns.map(_.minnull),
			maxs = props.data.columns.map(_.maxnull),
			centroids = maxs.map((max, i) => (max + mins[i]) / 2);

		var {colorColumn, colors, hideColors} = this.props.data,
			colorScale = cvtColorScale(colorColumn, colors),
			filter = filterFn(colorColumn, hideColors);
		var data = this.props.data.columns;
		var {radius} = this.props.data;
		var scale = cubeWidth / Math.max(...maxs.map((max, i) => max - mins[i]));
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
			// z is zero, so set far and near around it.
			views = new OrthographicView({far: -1, near: 1});
			viewState = {
				zoom: 4,
				minZoom: 2,
				maxZoom: 8,
				target: _.Let((c = cubeWidth / 2) => [c, c, 0])
			};
		} else {
			views = new OrbitView();
			viewState = {
				zoom: 4,
				minZoom: 2,
				maxZoom: 8,
				target: _.Let((c = cubeWidth / 2) => [c, c, c])
			};
		}
		var mergeLayer = dataLayer(data, modelMatrix, colorScale, radius * scale,
			isOrdinal(colors), [colorColumn, colors, hideColors], this.onHover, filter);
		return deckGL({
			layers: [...(twoD ? [] : [axesLayer()]), mergeLayer],
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
var mapDrawing = el(MapDrawing);

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

export class Map extends PureComponent {
	state = {
		tooltip: null
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
	render() {
		var handlers = _.pick(this.props, (v, k) => k.startsWith('on'));

		var mapState = this.props.state,
			params = _.get(mapState, 'dataset', []),
			mapData = getData(mapState),
			colorColumn = _.getIn(mapState, ['colorBy', 'data', 'req', 'values', 0]),
			colors = _.getIn(mapState, ['colorBy', 'data', 'scale']),
			hideColors = _.getIn(mapState, ['colorBy', 'hidden']),
			loading = dataLoading(mapState) || colorLoading(mapState),
			error = dataError(mapState) || colorError(mapState),
			columns = _.getIn(mapData, ['req', 'values']),
			view = mapState.view,
			labels = _.get(params, 'dimension', []),
			radius = getRadius(mapState),
			image = hasImage(mapState),
			imageState = image && _.getIn(mapState, ['image', image.path]),
			data = {columns, colorColumn, radius, colors,
				labels, view, image, imageState, hideColors},
			drawing = image ? imgDrawing : mapDrawing;

		return div({className: styles.content},
				div({className: styles.graphWrapper, ref: this.onRef},
					getStatusView(loading, error, this.onReload),
					drawing({...handlers, data, container: this.state.container})));
	}
}
