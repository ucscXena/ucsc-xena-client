import PureComponent from './PureComponent';
import {div, el, span} from './chart/react-hyper';
import DeckGL from '@deck.gl/react';
import {BitmapLayer, OrthographicView} from 'deck.gl';
import {COORDINATE_SYSTEM} from '@deck.gl/core';
import {TileLayer} from '@deck.gl/geo-layers';
import {Slider, Checkbox} from '@material-ui/core';
var slider = el(Slider);
var {assoc, findIndex, Let, pluck, range, times} = require('./underscore_ext').default;
var Rx = require('./rx').default;
var {ajax} = Rx.Observable;
import Autocomplete from '@material-ui/lab/Autocomplete';
import XAutosuggestInput from './views/XAutosuggestInput';
var xAutosuggestInput = el(XAutosuggestInput);
var autocomplete = el(Autocomplete);

//var {categoryMore} = require('./colorScales');
var {RGBToHex} = require('./color_helper').default;

//var colors = categoryMore.map(rgb);

var deckGL = el(DeckGL);
var checkbox = el(Checkbox);

var colors = [
	[0.0, 0.0, 1.0],
//	[1.0, 0.0, 0.0], // XXX for testing repeat color at different layers
	[0.0, 1.0, 0.0],
	[1.0, 0.0, 0.0],
	[0.0, 1.0, 1.0],
	[1.0, 0.0, 1.0],
	[1.0, 1.0, 0.0],
];
var colorsCss = colors.map(c => RGBToHex(...c.map(v => v * 255)));
var layers = 6;

/* eslint-disable no-unused-vars */
var fromAlpha = i =>
	`color.a = min(1., max(color.a - lower, 0.) / (upper - lower));
	color.r = ${colors[i % colors.length][0].toFixed(1)};
	color.g = ${colors[i % colors.length][1].toFixed(1)};
	color.b = ${colors[i % colors.length][2].toFixed(1)};`;

//	`color.a = min(${(1 / (i + 1)).toFixed(4)}, max(color.r - lower, 0.) / (upper - lower) / ${(i + 1).toFixed(4)});
//	`color.a = min(${(1 / (layers - i)).toFixed(4)}, max(color.r - lower, 0.) / (upper - lower) / ${(layers - i).toFixed(4)});
var fromGray = i =>
	`color.a = min(1., max(color.r - lower, 0.) / (upper - lower));
	color.r = ${colors[i % colors.length][0].toFixed(1)};
	color.g = ${colors[i % colors.length][1].toFixed(1)};
	color.b = ${colors[i % colors.length][2].toFixed(1)};`;

//var fromGray = i =>
//	`color.a = ${(1 / (layers - i)).toFixed(4)};
//	color.r = min(max(color.r - lower, 0.) / (upper - lower), 1.) * ${colors[i % colors.length][0].toFixed(1)};
//	color.g = min(max(color.g - lower, 0.) / (upper - lower), 1.) * ${colors[i % colors.length][1].toFixed(1)};
//	color.b = min(max(color.b - lower, 0.) / (upper - lower), 1.) * ${colors[i % colors.length][2].toFixed(1)};
//`;
/* eslint-enable no-unused-vars */

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
		value
	});

var directory = sessionStorage.png ? 'pyramid-png-gray' : 'pyramid';

//var baseUrl = 'http://localhost:8081';
var baseUrl = '';

var tileLayer2 = (name, index, opacity, visible/*, tintColor*/) =>
	new TileLayer({
		id: `tile-layer-${index}`,
		data: `${baseUrl}/${directory}/c${name}-{z}-{y}-{x}.png`,
		minZoom: 0,
		maxZoom: 7,
		tileSize: 512,
		// extent appears to be in the dimensions of the lowest-resolution image.
		extent: [0, 0, 136, 105],
		opacity: 1.0, // XXX no effect? It's mixed in before FILTER_COLOR???
		zoomOffset: 1,
		refinementStrategy: 'no-overlap',
		visible,
		// Have to include 'opacity' in props to force an update, because the
		// update algorithm doesn't see sublayer props.
		limits: opacity,
//		tintColor,
		renderSubLayers: props => {
			var {bbox: {left, top, right, bottom}} = props.tile;

			return new XenaBitmapLayer(props, {
				data: null,
				image: props.data,
				lower: opacity[0],
				upper: opacity[1],
				i: index,
				bounds: [left, bottom, right, top]
			});
		}
	});


//var eqToString =
//	Let((eqs = ['FUNC_ADD', 'FUNC_SUBTRACT', 'FUNC_REVERSE_SUBTRACT']) =>
//		gl => Let((eq = gl.getParameter(gl.BLEND_EQUATION)) =>
//			eqs.find(x => gl[x] === eq)));
//
//var funcToString =
//	Let((funcs = ['ZERO', 'ONE', 'SRC_COLOR', 'ONE_MINUS_SRC_COLOR',
//		'DST_COLOR', 'ONE_MINUS_DST_COLOR', 'SRC_ALPHA', 'ONE_MINUS_SRC_ALPHA',
//		'DST_ALPHA', 'ONE_MINUS_DST_ALPHA', 'CONSTANT_COLOR',
//		'ONE_MINUS_CONSTANT_COLOR', 'CONSTANT_ALPHA',
//		'ONE_MINUS_CONSTANT_ALPHA', 'SRC_ALPHA_SATURATE']) =>
//			(gl, param) => Let((p = gl.getParameter(param)) =>
//				funcs.find(x => gl[x] === p)));

var colorRange = ({min, max}) =>
	Let((over = (max - min) * 0.2) =>
		({min: Math.max(0, (min - over) / 256), max: Math.min(1, (max + over) / 256)}));

export default class Img2 extends PureComponent {//eslint-disable-line no-unused-vars
	state = {}
	onOpacity = i => (ev, op) => {
		var {opacity} = this.state;
		this.setState({opacity: [...opacity.slice(0, i), op, ...opacity.slice(i + 1)]});
	}
	componentDidMount() {
		var stats = {
			url: `${baseUrl}/pyramid/stats.json`,
			responseType: 'text', method: 'GET', crossDomain: true};

		ajax(stats).map(r => JSON.parse(r.response)).subscribe(m => {
			var stats = m.stats.map((l, i) => ({i, ...l})),
				opacity = stats.map(({min, max}) => [min / 256, max / 256]),
				channels = pluck(stats, 'name'),
				inView = m.defaults ?
					m.defaults.slice(0, layers).map(c => channels.indexOf(c)) :
					range(Math.min(layers, stats.length)),
				visible = times(layers, () => true);
//				color = stats.map((s, i) => colors[i % colors.length]);
	 		this.setState({stats, opacity, /*color, */inView, visible});
		});
	}
	onVisible = i => (ev, checked) => {
		var visible = assoc(this.state.visible, i, checked);
		this.setState({visible});
	}
	onChannel = i => (ev, channel) => {
		var {stats, inView} = this.state,
			newC = findIndex(stats, s => s.name === channel);
		this.setState({inView: assoc(inView, i, newC)});
	}
	render() {
		if (!this.state.stats) {
			return null;
		}
		var views = new OrthographicView({far: -1, near: 1}),
			{stats, inView} = this.state,
			zoom = 0,
			{onVisible} = this,
			viewState = {
				zoom,
				minZoom: -2,
				maxZoom: 10,
				target: [250, 250]
			};

		return div({style: {display: 'flex'}},
			div({style: {position: 'relative', width: 800, height: 600, border: '3px solid black'}},
				deckGL({
//					onWebGLInitialized: gl => {
//						console.log('init', gl);
//						console.log('attr', gl.getContextAttributes());
//						console.log('eq', eqToString(gl));
//						console.log('src', funcToString(gl, gl.BLEND_SRC_RGB));
//						console.log('dst', funcToString(gl, gl.BLEND_DST_RGB));
//						console.log('src alpha', funcToString(gl, gl.BLEND_SRC_ALPHA));
//						console.log('dst alpha', funcToString(gl, gl.BLEND_DST_ALPHA));
////						console.log('eq', gl.getParameter(gl.BLEND_EQUATION));
////						console.log('alpha', gl.getParameter(gl.ALPHA_BITS));
//					},
					glOptions: {
						alpha: false
					},
					layers: inView.map((c, i) => tileLayer2(c, i, this.state.opacity[c], this.state.visible[i], colors[i % colors.length])),
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
					checkbox({checked: this.state.visible[i], onChange: onVisible(i)}),
					span({style: {display: 'inline-block', width: 20, height: 20, backgroundColor: colorsCss[i % colors.length]}}),
					channelSelect({channels: pluck(stats, 'name'), value: stats[c].name, onChange: this.onChannel(i)}),
					slider({...colorRange(stats[c]), step: 0.01,
						value: this.state.opacity[c], onChange: this.onOpacity(c)})))));
	}
}
