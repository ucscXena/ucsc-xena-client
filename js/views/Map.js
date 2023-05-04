import {/*Button, */Icon, IconButton} from '@material-ui/core';
import PureComponent from '../PureComponent';
import styles from './Map.module.css';
import {div, el, img} from '../chart/react-hyper.js';
var _ = require('../underscore_ext').default;
import * as colorScales from '../colorScales';
import spinner from '../ajax-loader.gif';
import {ScatterplotLayer, PointCloudLayer, OrbitView, OrthographicView} from 'deck.gl';
import DeckGL from '@deck.gl/react';
import {DataFilterExtension} from '@deck.gl/extensions';

import AxesLayer from './axes-layer';

import {ThemeProvider, createTheme} from '@material-ui/core/styles';
import {grey} from '@material-ui/core/colors';
import Avivator from '../avivator/src/Avivator.jsx';
import {DETAIL_VIEW_ID} from 'ucsc-xena-viv';
var {transpose} = require('../underscore_ext').default;
import {COORDINATE_SYSTEM} from '@deck.gl/core';
// XXX Try to ditch this, in favor of the singlecell scales that
// provide rgb.
var toRGB = require('../color_helper').default.rgb;
import {colorError, colorLoading, dataError, dataLoading, getRadius} from '../models/map';

var iconButton = el(IconButton);
var icon = el(Icon);

function getVivId(id) { // XXX copied from viv
  return `-#${id}#`;
}

const darkTheme = createTheme({
	palette: {
		type: 'dark',
		primary: grey,
		secondary: grey
	},
	overrides: {
		MuiButton: {
			root: {
				backgroundColor: '#424242bf',
				'&:hover': {
					backgroundColor: 'black',
				},
			},
		},
	},
	props: {
		MuiButtonBase: {
			disableRipple: true,
		}
	}
});

// Styles

// https://gamedev.stackexchange.com/questions/53601/why-is-90-horz-60-vert-the-default-fps-field-of-view
//var perspective = 60;

var deckGL = el(DeckGL);

var filterFn = (colorColumn, hideColors) =>
	colorColumn ?
		_.Let((hidden = new Set(hideColors || [])) =>
			(coords, {index}) => _.Let((v = colorColumn[index]) =>
				v == null || hidden.has(v) ? 0 : 1))
	: () => 1;

const patchLayer = (data, color, radius, triggers, onHover, getFilterValue) => new ScatterplotLayer({
	id: `scatter-plot${getVivId(DETAIL_VIEW_ID)}`,
	data: data,
	stroked: true,
	getLineWidth: 50,
	filled: false,
	getPosition: d => d.coordinates,
	lineWidthMinPixels: 2,
	lineWidthMaxPixels: 3,
	getRadius: radius,
	getLineColor: color,
	updateTriggers: {getLineColor: triggers},
	pickable: true,
	onHover,
	getFilterValue,
	filterRange: [1, 1],
	extensions: [new DataFilterExtension({filterSize: 1})]
});

const patchLayerMap = (data, color, radius, triggers, onHover, getFilterValue) => new PointCloudLayer({
	id: 'scatter',
	coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
	sizeUnits: 'common',
	data: data,
	material: false,
	getPosition: d => d,
	pointSize: radius,
	getColor: color,
	// XXX not sure if updateTriggers is necessary. The accessor functions
	// that depend on these should already compare not-equal.
	updateTriggers: {getColor: triggers},
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
			(coords, {index}) => toRGB(scale(colorColumn[index])))
	: () => [0, 255, 0];



class MapDrawing extends PureComponent {
	onHover = ev => {
		var i = ev.index;
		this.props.onTooltip(i < 0 ? null : i);
	}
	render() {
		var {props} = this;
		if (!_.every(props.data.columns, _.identity)) {
			return null;
		}
		if (!this.props.container) {
			return null;
		}
		var border = 2;
		var bcr = this.props.container.getBoundingClientRect();
		var width = Math.round(bcr.width - border);
		var height = Math.round(bcr.height - border);
		var twoD = props.data.columns.length === 2;
		var mins = props.data.columns.map(_.minnull),
			maxs = props.data.columns.map(_.maxnull),
			centroids =  maxs.map((max, i) => (max + mins[i]) / 2);

		var {colorColumn, colors, hideColors} = this.props.data,
			colorScale = cvtColorScale(colorColumn, colors),
			filter = filterFn(colorColumn, hideColors);
		var data = transpose(this.props.data.columns);
		var {radius} = this.props.data;
		var scale = x => x;
		// XXX fix range & ticks
		scale.range = () => [0, 20];
		scale.ticks = () => [0, 10, 20];
		var axesLayer = () => new AxesLayer({
			xScale: scale,
			yScale: scale,
			zScale: scale,
			padding: 0
		});
		var views, viewState;
		if (twoD) {
			// z is zero, so set far and near around it.
			views = new OrthographicView({far: -1, near: 1});
			// zoom 0 is 1 unit to one pixel. To fit width, scale would be
			// width / dataMax - dataMin. Scale is 2^zoom, so zoom is
			// log2(scale).
			let zoom = 0.95 * Math.min(Math.log2(width / (maxs[0] - mins[0])),
				Math.log2(height / (maxs[1] - mins[1])));
			viewState = {
				zoom,
				minZoom: 0.5 * zoom,
				maxZoom: 4 * zoom,
				target: [(maxs[0] + mins[0]) / 2, (maxs[1] + mins[1]) / 2, 0]};
		} else {
			views = new OrbitView();
			let zoom = Math.min(Math.log2(width / (maxs[0] - mins[0])),
				Math.log2(height / (maxs[2] - mins[2])));
			viewState = {
				zoom: 0.95 * zoom,
				minZoom: 0.5 * zoom,
				maxZoom: 4 * zoom,
				target: centroids
			};
		}
		var mergeLayer = patchLayerMap(data, colorScale, radius, [colorColumn, colors, hideColors], this.onHover, filter);
		return deckGL({
			layers: [mergeLayer, ...(twoD ? [] : [axesLayer()])],
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
			style: {backgroundColor: '#FFFFFF'}
		});
	}
}
var mapDrawing = el(MapDrawing);

var avivator = props => el(ThemeProvider)({theme: darkTheme}, el(Avivator)(props));


class VivDrawing extends PureComponent {
	state = {};
	onHover = ({index}) => {
		this.props.onTooltip(index === -1 ? null : index);
	}
	render() {
		var {props} = this;
		if (!_.every(props.data.columns, _.identity)) {
			return null;
		}
		var {colorColumn, colors, radius, hideColors} = props.data,
			colorScale = cvtColorScale(colorColumn, colors),
			filter = filterFn(colorColumn, hideColors);
		var {offset, image_scalef: scale} = props.data.image;
		var data = transpose(props.data.columns).map(c =>
			({coordinates: [scale * c[0] + offset[0], scale * c[1] + offset[1]]}));
		radius = radius * scale;
		var mergeLayer = patchLayer(data, colorScale, radius, [colorColumn, colors, hideColors], this.onHover, filter);
		return avivator({
			mergeLayers: colors ? [mergeLayer] : [],
			source: {urlOrFile: props.data.image.path}
		});
	}
}

var vivDrawing = el(VivDrawing);

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

// XXX still needed?
var fudgeOme = path => path.replace(/mosaic_DAPI_z2.tif/, 'mosaic_DAPI_z2_ome.tif');

var relativeOrAbsolute = (host, path) => path.startsWith('http') ? path :
	host + '/download' + path;

function setHost(dsID, image) {
	var {host} = JSON.parse(dsID);
	return image && _.assoc(image, 'path', relativeOrAbsolute(host, fudgeOme(image.path)));
}

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
		var {onTooltip} = this.props;

		var mapState = this.props.state,
			{dsID, ...params} = _.get(mapState, 'dataset', []),
			mapData = _.getIn(mapState, ['data', dsID]),
			colorColumn = _.getIn(mapState, ['colorBy', 'data', 'req', 'values', 0]),
			colors = _.getIn(mapState, ['colorBy', 'data', 'scale']),
			hideColors = _.getIn(mapState, ['colorBy', 'hidden']),
			loading = dataLoading(mapState) || colorLoading(mapState),
			error = dataError(mapState) || colorError(mapState),
			columns = params.dimension
				.map(d => _.getIn(mapData, [d, 'req', 'values', 0])),
			view = mapState.view,
			labels = _.get(params, 'dimension', []),
			radius = getRadius(mapState),
			// don't create an image parameter while doing this
			image = setHost(dsID, _.getIn(params, ['image', 0])),
			data = {columns, colorColumn, radius, colors,
				labels, view, image, hideColors},
			drawing = image ? vivDrawing : mapDrawing;

		return div({className: styles.content},
				div({className: styles.graphWrapper, ref: this.onRef},
					getStatusView(loading, error, this.onReload),
					drawing({onTooltip, data, container: this.state.container})));
	}
}
