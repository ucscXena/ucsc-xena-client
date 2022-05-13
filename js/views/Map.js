var React = require('react');
import Dialog from 'react-toolbox/lib/dialog';
import PureComponent from '../PureComponent';
import styles from './Map.module.css';
import {div, el, label, option, p, select, textNode}
	from '../chart/react-hyper.js';
var dialog = el(Dialog);
var _ = require('../underscore_ext').default;
import {suitableColumns} from '../chart/utils';
import * as colorScales from '../colorScales';
import spinner from '../ajax-loader.gif';
import widgets from '../columnWidgets';
import {item} from './Legend.module.css';
import {Button} from 'react-toolbox/lib/button';
import {ScatterplotLayer, PointCloudLayer, OrbitView, OrthographicView} from 'deck.gl';
import DeckGL from '@deck.gl/react';

import AxesLayer from './axes-layer';

import {ThemeProvider, createMuiTheme} from '@material-ui/core/styles';
import {grey} from '@material-ui/core/colors';
import Avivator from '../avivator/src/Avivator.jsx';
import {DETAIL_VIEW_ID} from '@hms-dbmi/viv';
var {transpose} = require('../underscore_ext').default;
import {COORDINATE_SYSTEM} from '@deck.gl/core';
// XXX Try to ditch this, in favor of the singlecell scales that
// provide rgb.
var toRGB = require('../color_helper').default.rgb;

function getVivId(id) { // XXX copied from viv
  return `-#${id}#`;
}

const darkTheme = createMuiTheme({
  palette: {
    type: 'dark',
    primary: grey,
    secondary: grey
  },
  props: {
    MuiButtonBase: {
      disableRipple: true
    }
  }
});

var button = el(Button);

// https://gamedev.stackexchange.com/questions/53601/why-is-90-horz-60-vert-the-default-fps-field-of-view
//var perspective = 60;

var deckGL = el(DeckGL);

const patchLayer = (data, color, radius, onHover) => new ScatterplotLayer({
	id: `scatter-plot${getVivId(DETAIL_VIEW_ID)}`,
	data: data,
	stroked: true,
	getLineWidth: 50,
	filled: false,
	getPosition: d => d.coordinates,
	lineWidthMinPixels: 2,
	lineWidthMaxPixels: 3,
	getRadius: radius,
	getFillColor: [255, 0, 0],
	getLineColor: color,
	pickable: true,
	onHover
});

const patchLayerMap = (data, color, onHover) => new PointCloudLayer({
	id: 'scatter',
	coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
	sizeUnits: 'meters',
	data: data,
	getPosition: d => d,
	pointSize: 0.1,
	getColor: color,
	getNormal: [1, 1, 1],
	pickable: true,
	onHover
});

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

		var {colorColumn, colors} = this.props.data,
			colorScale = colorColumn ?
				_.Let((scale = colorScales.colorScale(colors)) =>
					(coords, {index}) => toRGB(scale(colorColumn[index])))
				: () => [0, 255, 0];
		var data = transpose(this.props.data.columns);
		var {radius} = this.props.data;
		var mergeLayer = patchLayerMap(data, colorScale, radius, this.onHover);
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
			let zoom = Math.min(Math.log2(width / (maxs[0] - mins[0])),
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
		return deckGL({
			layers: [mergeLayer, ...(twoD ? [] : [axesLayer()])],
			views,
			controller: true,
			coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
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

function ThemedAvivator(props) {
	return (
      <ThemeProvider theme={darkTheme}>
        <Avivator {...props} />
      </ThemeProvider>);
}
var avivator = el(ThemedAvivator);

class VivDrawing extends PureComponent {
	state = {};
	onHover = ({index}) => {
		this.props.onTooltip(index === -1 ? null : index);
	}
	render() {
		if (!_.every(this.props.data.columns, _.identity)) {
			return null;
		}
		var {colorColumn, colors, radius} = this.props.data,
			colorScale = colorColumn ?
				_.Let((scale = colorScales.colorScale(colors)) =>
					(coords, {index}) => toRGB(scale(colorColumn[index])))
				: () => [0, 255, 0];
		var {offset, image_scalef: scale} = this.props.data.image;
		var data = transpose(this.props.data.columns).map(c =>
			({coordinates: [scale * c[0] + offset[0], scale * c[1] + offset[1]]}));
		var mergeLayer = patchLayer(data, colorScale, radius, this.onHover);
		return /*this.state.source ? */avivator({
			mergeLayers: [mergeLayer],
			source: {urlOrFile: this.props.data.image.path}
		})/* : 'loading'*/;
	}
}

var vivDrawing = el(VivDrawing);

var colorOptions = state =>
	[{value: 'none', label: 'None'}].concat(suitableColumns(state, false));

var getOpt = opt => option({key: opt.value, ...opt});

function colorSelector(state, onChange) {
	var storedColumn = _.getIn(state, ['map', 'colorColumn']),
		axisOpts = colorOptions(state),
		value = storedColumn || 'none',
		sel;

	sel = select({className: 'form-control', value, onChange},
		...axisOpts.map(getOpt));

	return (
		div({className: styles.column},
			label(textNode('Color')), div(sel)));
}

function mapSelector(availableMaps, value, onChange) {
	var opts = availableMaps.map(([, params], i) => ({value: i,
			label: params.label})),
		sel = select({className: 'form-control', value, onChange},
			...opts.map(getOpt));

	return (
		div({className: styles.mapSelector},
			label(textNode('Map')), div(sel)));
}

function firstMatch(el, selector) {
	return el.matches(selector) ? el :
		el.parentElement ? firstMatch(el.parentElement, selector) :
		null;
}

function getColorColumn(state) {
	var colorId = _.getIn(state, ['map', 'colorColumn']);
	return state.columns[colorId] ? colorId : null;
}

var nbsp = '\u00A0';
class SideBar extends PureComponent {
	onColor = ev => {
		this.props.onColor(ev.currentTarget.value);
	}
	onMap = ev => {
		this.props.onMap(this.props.maps[ev.currentTarget.value]);
	}
	onClick = ev => {
		var i = _.getIn(firstMatch(ev.target, '.' + item), ['dataset', 'i']);
		if (i != null) {
			this.props.onCode(parseInt(i, 10));
		}
	}
	render() {
		var {tooltip, maps, mapValue, state} = this.props,
			id = getColorColumn(state),
			column = state.columns[id],
			data = _.getIn(state, ['data', id]);

		return div({className: styles.sideBar, onClick: this.onClick},
			mapSelector(maps, mapValue, this.onMap),
			colorSelector(state, this.onColor),
			p(tooltip ? `Sample ${tooltip.sampleID}` : nbsp),
			p(tooltip && tooltip.valTxt ? `Value: ${tooltip.valTxt}` : nbsp),
			column ? p({className: styles.actions},
				button({label: 'Hide all', onClick: this.props.onHideAll}),
				button({label: 'Show all', onClick: this.props.onShowAll})) : null,
			column ? div({className: styles.legend},
				widgets.legend({column, data, clickable: true})) : null);
	}
}
var sideBar = el(SideBar);

var gray = '#F0F0F0';
function setHidden(state) {
	var mapState = _.get(state, 'map'),
		colorId = getColorColumn(state),
		hideColors = _.getIn(mapState, ['hidden', colorId], []),
		// first element of a color spec is the type. Get the type of the first
		// color scale.
		scaleType = _.getIn(state, ['columns', colorId, 'colors', 0, 0]);

	return colorId && scaleType === 'ordinal' ?
		// third element of an ordinal scale is the custom color setting
		_.assocIn(state, ['columns', colorId, 'colors', 0, 2],
			_.object(hideColors, hideColors.map(_.constant(gray)))) :
		state;
}

function getStatusView(loading, error, onReload) {
	if (loading) {
		return (
			<div className={styles.status}>
				<img style={{textAlign: 'center'}} src={spinner}/>
			</div>);
	}
	if (error) {
		return (
			<div className={styles.status}>
				<i onClick={onReload}
				   title='Error loading data. Click to reload.'
				   aria-hidden='true'
				   className={'material-icons'}>warning</i>
			</div>);
	}
	return null;
}

var fudgeOme = path => path.replace(/mosaic_DAPI_z2.tif/, 'mosaic_DAPI_z2_ome.tif');

function setHost(dsID, image) {
	var {host} = JSON.parse(dsID);
	return image && _.assoc(image, 'path', host + '/download' + fudgeOme(image.path));
}

export class Map extends PureComponent {
	state = {
		tooltip: null
	}
	onMove = view => {
		// The threejs controls will emit an event when they are changed
		// programmatically. The emitted event can't be blocked by temporarily
		// silencing the callback. Maybe it's async. Also, the target
		// can't be round-tripped accurately: if you set the target to the
		// position passed in the event, it will generate a new event with
		// a position that is different by a few low bits. To avoid an echo
		// in the state, then, we do a fuzzy floating point compare, and drop
		// events that are close.
		var thresh = 10e-7,
			{position: pos0, target: targ0} = this.props.state.map.view || {};

		if (!pos0 || !targ0 || _.any(view.position, (v, i) => Math.abs(v - pos0[i]) > thresh)
				|| _.any(view.target, (v, i) => Math.abs(v - targ0[i]) > thresh)) {

			this.props.callback(['map-view', view]);
		}
	}
	onTooltip = i => {
		if (i === null) {
			this.setState({tooltip: null});
			return;
		}
		var {state} = this.props;
		var sampleID = state.cohortSamples[i];
		var colorID = getColorColumn(state) || 'none';
		var value, valTxt;
		if (colorID !== 'none') {
			value = state.data[colorID].req.values[0][i];
			valTxt = _.get(state.data[colorID].codes, value, String(value));
		}

		this.setState({tooltip: {sampleID, valTxt}});
	}
	onColor = column => {
		this.props.callback(['map-color', column]);
	}
	onMap = map => {
		this.props.callback(['map-select', map]);
	}
	onCode = i => {
		var {state} = this.props,
			color = state.map.colorColumn,
			hidden = _.getIn(state.map, ['hidden', color], []),
			has = _.contains(hidden, i),
			next = has ? _.without(hidden, i) : hidden.concat([i]);

		this.props.callback(['map-hide-codes', next]);
	}
	onHideAll = () => {
		var {state} = this.props,
			colorId = state.map.colorColumn,
			count = state.data[colorId].codes.length;
		this.props.callback(['map-hide-codes', _.range(count)]);
	}
	onShowAll = () => {
		this.props.callback(['map-hide-codes', []]);
	}
	onHide = () => {
		this.props.callback(['map', false]);
	}
	onReload = () => {
		this.props.callback(['map', true]);
	}
	onRef = ref => {
		this.setState({container: ref});
	}
	render() {
		var actions = [
			{
				children: [<i className='material-icons'>close</i>],
				className: styles.mainDialogClose,
				onClick: this.onHide
			}],
			{onTooltip, onMove, onColor, onCode, onHideAll, onShowAll, onMap,
				state: {tooltip}} = this;

		var state = setHidden(this.props.state),
			mapState = _.get(state, 'map'),
			[dsID, params] = _.get(mapState, 'map', []),
			mapData = _.getIn(mapState, ['data', dsID]),
			status = params.dimension.map(d => _.getIn(mapData, [d, 'status'])),
			loading = _.any(status, s => s === 'loading'),
			error = _.any(status, s => s === 'error'),
			columns = params.dimension
				.map(d => _.getIn(mapData, [d, 'req', 'values', 0])),
			colorId = getColorColumn(state),
			colorColumn = _.getIn(state, ['data', colorId,
				'req', 'values', 0]),
			hideColors = _.getIn(mapState, ['hidden', colorColumn]),
			colors = _.getIn(state, ['columns', colorId, 'colors', 0]),
			availableMaps = mapState.available,
			mapValue = _.findIndex(availableMaps,
				_.partial(_.isEqual, _.get(mapState, 'map'))),
			view = mapState.view,
			labels = _.get(params, 'dimension', []),
			radius = _.get(params, 'spot_diameter', 200) / 2,
			// don't create an image parameter while doing this
			image = setHost(dsID, _.getIn(params, ['image', 0])),
			data = {columns, colorColumn, radius, colors,
				hideColors, labels, view, image},
			drawing = image ? vivDrawing : mapDrawing;

		return dialog({active: true, actions, onEscKeyDown: this.onHide,
					onOverlayClick: this.onHide,
					className: styles.mainDialog,
					theme: {overlay: styles.dialogOverlay,
						body: styles.dialogBody
					}},
				div({className: styles.content},
					div({className: styles.graphWrapper, ref: this.onRef},
						getStatusView(loading, error, this.onReload),
						drawing({onTooltip, onMove, data, container: this.state.container})),
					sideBar({tooltip, state, maps: availableMaps, mapValue,
						onColor, onMap, onCode, onHideAll, onShowAll})));
	}
}
