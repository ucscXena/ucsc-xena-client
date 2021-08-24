var React = require('react');
import Dialog from 'react-toolbox/lib/dialog';
import {Component} from 'react';
import PureComponent from '../PureComponent';
import styles from './Map.module.css';
import {canvas, div, el, label, option, p, select, textNode}
	from '../chart/react-hyper.js';
import * as THREE from 'three/build/three';
import {OrbitControls} from './OrbitControls';
import disc from './disc.png';
import picker from './picker.png';
var dialog = el(Dialog);
var _ = require('../underscore_ext').default;
import Axes3d from './Axes3d';
import Rx from '../rx';
import {suitableColumns} from '../chart/utils';
import * as colorScales from '../colorScales';
var {rxEvents} = require('../react-utils');
import {hidden} from '../nav';
import spinner from '../ajax-loader.gif';
import widgets from '../columnWidgets';
import {item} from './Legend.module.css';
import {Button} from 'react-toolbox/lib/button';

var debug = false;

var drawing = false; // XXX singleton
var dumpRadeonPicker;

var button = el(Button);

function particles(sprite, size, vertices, color) {
	const geometry = new THREE.BufferGeometry();

	geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
	geometry.setAttribute('color', new THREE.Float32BufferAttribute(color, 3));
	var material = new THREE.PointsMaterial({size,
		map: sprite,
		transparent: false,
		alphaTest: 0.5,
		vertexColors: true});
	return new THREE.Points(geometry, material);
}

var pickingClone = (sprite, len) => points => {
	var geometry = points.geometry.clone(),
		material = points.material.clone(),
		c = new THREE.Color(),
		color = _.times(len, i => {
			c.setHex(i);
			return [c.r, c.g, c.b];
		}).flat();
	// If we use map, a shadow is drawn between overlapping points. The
	// shadow color will alias with other points.
	// If we use alphamap, there's no shadow.
	material.map = undefined;
	material.alphaMap = sprite;
	material.needsUpdate = true;
	geometry.setAttribute('color', new THREE.Float32BufferAttribute(color, 3));
	return new THREE.Points(geometry, material);
};

function textTexture(text, sz) {
	var c = document.createElement('canvas'),
		ctx = c.getContext('2d'),
		w;

	ctx.font = sz + 'px sans-serif';

	w = ctx.measureText(text).width;
	c.width = w;
	c.height = sz + 2;
	// Have to reset font after resize of canvas
	ctx.font = sz + 'px sans-serif';
	ctx.fillStyle = 'black';
	ctx.fillText(text, 0, sz + 1);

	return {aspect: c.width / c.height, texture: new THREE.CanvasTexture(c)};
}

var labelMaterial = (txt, sz = 12) => _.Let((map = textTexture(txt, sz)) => [map.aspect, [
	new THREE.MeshBasicMaterial({color: 0xffffff}),
	new THREE.MeshBasicMaterial({color: 0xffffff}),
	new THREE.MeshBasicMaterial({color: 0xffffff}),
	new THREE.MeshBasicMaterial({color: 0xffffff}),
	new THREE.MeshBasicMaterial({map: map.texture, transparent: true}),
	new THREE.MeshBasicMaterial({map: map.texture, transparent: true})]]);

// Size in the scene is set by the geometry, camera position,
// and scale. Aspect should be set by the text aspect, which
// we should measure from the canvas.
// Resolution is set by canvas resolution, which depends on
// font size: larger font size for more pixels.
var lHeight = 90;
function labelx(txt, min, max, twoD) {
	var [aspect, material] = labelMaterial(txt, 24);
	var geometry = new THREE.BoxGeometry(lHeight * aspect, lHeight, 1)
		.translate(lHeight * aspect / 2, lHeight / 4, 0);
	return new THREE.Mesh(geometry, material)
		.translateX(max).translateY(min).translateZ(twoD ? 0 : min);
}

function labely(txt, min, max, twoD) {
	var [aspect, material] = labelMaterial(txt, 24);
	var geometry = new THREE.BoxGeometry(lHeight * aspect, lHeight, 1)
		.translate(lHeight * aspect / 2, lHeight / 4, 0);
	return new THREE.Mesh(geometry, material)
		.translateY(max).translateX(min).translateZ(twoD ? 0 : min)
		.rotateZ(Math.PI / 2);
}

function labelz(txt, min, max) {
	var [aspect, material] = labelMaterial(txt, 24);
	var geometry = new THREE.BoxGeometry(lHeight * aspect, lHeight, 1)
		.translate(-lHeight * aspect / 2, lHeight / 4, 0);
	return new THREE.Mesh(geometry, material)
		.translateZ(max).translateX(min).translateY(min)
		.rotateY(Math.PI / 2);
}

//var maxZoom = 100; // for 2d orthographic view

// https://gamedev.stackexchange.com/questions/53601/why-is-90-horz-60-vert-the-default-fps-field-of-view
var perspective = 60;

// XXX This is not the best for performance. Would be better
// to use the scale.rgb methods. For ordinal, we would need
// to implement an rgb method, which would need to ahead-of-time walk the
// ordinal palette and convert it to rgb.
var toColor = (column, scale) => {
	var color = new THREE.Color(),
		colors = [];
	column.forEach(v => {
		color.setStyle(scale(v));
		colors.push(color.r, color.g, color.b);
	});
	return colors;
};

function twoDInitialDistance(width, height, centroids, mins) {
	// compute distance from z = 0 if data fills screen in x
	// or y dimension, and take the larger distance (so all data
	// fits on screen).
	var maxdx = (centroids[0] - mins[0]) /
			Math.tan((perspective * width / height / 2) / 180 * Math.PI),
		maxdy = (centroids[1] - mins[1]) /
			Math.tan((perspective / 2) / 180 * Math.PI);
	return Math.max(maxdx, maxdy);
}

var loaded;
var loader = new Promise(resolve => loaded = resolve);

function points(el, props) {
	var pointGroups = [], // zero or one, like a 'maybe'.
		pickingGroups = [], // zero or one, like a 'maybe'.
		axes = [],
		labels = [],
		mouse = new THREE.Vector2(),
		size;

	var sprite = new THREE.TextureLoader().load(disc);
	// XXX move picking stuff into separate contexts, and only
	// instantiate one of them.
	var pickingSprite = new THREE.TextureLoader().load(picker);
	var scene = new THREE.Scene();
	var pickingScene = new THREE.Scene();

	scene.background = new THREE.Color(0xffffff);
	pickingScene.background = new THREE.Color(0xffffff);

	var renderer = new THREE.WebGLRenderer({canvas: el, antialias: true});
	_.Let(({clientWidth, clientHeight} = el) => {
		renderer.setSize(clientWidth, clientHeight, {updateStyle: false});
	});
	renderer.setClearColor(new THREE.Color(1, 1, 1));
	renderer.clear();

	// See discussion https://github.com/mrdoob/three.js/issues/16747
	renderer.setPixelRatio(window.devicePixelRatio);
	var {width, height} = _.Let((size = new THREE.Vector2()) => {
		renderer.getDrawingBufferSize(size);
		return size;
	});
	var resolution = new THREE.Vector2(width, height);

	// We reset camera near & far params in init(), after inspecting the data.
	var camera = new THREE.PerspectiveCamera(perspective, width / height, 2, 4000);
	var controls = new OrbitControls(camera, renderer.domElement);
	controls.enableDamping = true;

	el.style.touchAction = 'none'; // XXX render this in react?

	var radeonPickingTarget = new THREE.WebGLRenderTarget(width, height);
	function pickRadeon(x, y) {
		renderer.setRenderTarget(radeonPickingTarget);
		renderer.render(pickingScene, camera);

		const pixelBuffer = new Uint8Array(4);
		renderer.readRenderTargetPixels(radeonPickingTarget,
			~~(x * window.devicePixelRatio),
			~~(height - y * window.devicePixelRatio), 1, 1, pixelBuffer);
		renderer.setRenderTarget(null);

		return pixelBuffer;
	}

	//interpret the pixel as an ID
	var lookupId = buff => buff[0] << 16 | buff[1] << 8 | buff[2];

	function dumpPicker(picker) {
		var width = 200, height = 200;
		var el = document.createElement('canvas');
		el.width = width;
		el.height = height;
		var ctx = el.getContext('2d'),
			id = ctx.getImageData(0, 0, width, height),
			b;

		for (var y = 0; y < height; ++y) {
			for (var x = 0; x < width; ++x) {
				b = picker(x, y);
				id.data[(y * width + x) * 4 + 0] = b[0];
				id.data[(y * width + x) * 4 + 1] = b[1];
				id.data[(y * width + x) * 4 + 2] = b[2];
				id.data[(y * width + x) * 4 + 3] = b[3];
			}
		}
		ctx.putImageData(id, 0, 0);
		var link = document.createElement('a');
		link.download = 'filename.png';
		link.href = el.toDataURL();
		link.click();
	}

	dumpRadeonPicker = () => dumpPicker(pickRadeon);

	var toggle = false;
	function render() {
		if (debug && toggle) {
			renderer.render(pickingScene, camera);
		} else {
			renderer.render(scene, camera);
		}
		if (debug) {
			toggle = !toggle;
		}
		controls.update();
	}

	function onChange()  {
		var color = pointGroups[0].geometry.getAttribute('color').array;

		var i = lookupId(pickRadeon(mouse.x, mouse.y));
		props.onTooltip(i <= color.length ? i : null);
	}

	function animate() {
		drawing = false;
		var point1 = new THREE.Vector3();
		var point2 = new THREE.Vector3();
		point1.setFromMatrixPosition(camera.matrixWorld);
		labels.forEach(label => {
			label.updateMatrix();
			point2.setFromMatrixPosition(label.matrixWorld);
			var dist = point1.distanceTo(point2);
			var s = dist / 3000;
			label.scale.set(s, s, s);
			label.updateMatrix();
		});

		render();
		onChange();
	}

	function setGroups(props) {
		var {colorColumn} = props.data,
			// must have at least columns[0]. Extend to 3 dimensions.
			columns = _.times(3, i => props.data.columns[i] ||
				new Array(props.data.columns[0].length).fill(0)),
			colorScale = colorColumn ? colorScales.colorScale(props.data.colors)
				: () => '#00f000';

		pointGroups.forEach(g => scene.remove(g)); // empty the current groups
		pointGroups = [particles(sprite, size,
			_.times(columns[0].length, i => columns.map(c => c[i])).flat(),
			toColor(colorColumn || _.range(columns[0].length), colorScale))];
		pointGroups.forEach(g => scene.add(g));

		pickingGroups.forEach(g => pickingScene.remove(g));
		pickingGroups = pointGroups.map(pickingClone(pickingSprite, columns[0].length));
		pickingGroups.forEach(g => pickingScene.add(g));
	}

	function setView({position, target}) {
		camera.position.set(...position);
		controls.target.set(...target);
	}

	function init(props) {
		var twoD = props.data.columns.length === 2;
		var mins = props.data.columns.map(_.minnull),
			maxs = props.data.columns.map(_.maxnull),
			centroids =  maxs.map((max, i) => (max + mins[i]) / 2);

		var min = _.minnull(props.data.columns.map(_.minnull)),
			max = _.maxnull(props.data.columns.map(_.maxnull));

		size = (max - min) / 50; // XXX this is probably wrong

		setGroups(props);

		// on change of map, we need to recreate axes, labels, and tooltip.
		axes.forEach(a => scene.remove(a));
		axes = [new Axes3d(resolution, min, max, props.data.columns.length)];
		axes.forEach(a => scene.add(a));

		labels.forEach(l => scene.remove(l));
		labels = _.mmap(props.data.labels, [labelx, labely, labelz],
			(label, fn) => fn(label, min, max, twoD));
		labels.forEach(l => scene.add(l));

		// Compute max distance, initial distance, min distance, frustrum near,
		// frustrum far.
		// Initial distance should put all data on screen. Max distance
		// should be a bit more, possibly putting the axes on screen.
		// Frustrum far should be max distance, or slightly more.
		// Min distance should allow, say, 50x zoom. Near frustrum should
		// support min distance, so should be the same, or slightly smaller
		// so it doesn't clip at max zoom.
		var initialDistance;
		if (twoD) {
			initialDistance = twoDInitialDistance(width, height, centroids, mins);
			controls.maxDistance = initialDistance * 1.1;
			controls.minDistance = controls.maxDistance / 50;
			camera.far = controls.maxDistance * 1.05; // add 5% buffer behind data
			camera.near = controls.minDistance * 0.9;
		} else {
			controls.maxDistance =  2 * (max - min);
			controls.minDistance = .25 * (max - min);
		}
		if (props.data.view) {
			setView(props.data.view);
		} else {
			if (twoD) {
				camera.position.x = centroids[0];
				camera.position.y = centroids[1];
				camera.position.z = initialDistance;
			} else {
				camera.position.z = min + 2 * (max - min);
				camera.position.y = max + (max - min);
				camera.position.x = max + (max - min);
			}

			controls.target = new THREE.Vector3(centroids[0], centroids[1],
				twoD ? 0 : centroids[2]);
		}
		camera.updateProjectionMatrix();
		controls.enableRotate = !twoD;

		controls.update();
		// Force update so we can compute camera distance from labels on the
		// first render.
		scene.updateMatrixWorld();
	}

	init(props); // assigns controls

	function update(newProps) {
		if (_.isEqual(newProps.data.columns, props.data.columns)) {
			if (!_.isEqual(newProps.data.colorColumn, props.data.colorColumn) ||
				!_.isEqual(newProps.data.colors, props.data.colors)) {
				setGroups(newProps);
			}
			if (!_.isEqual(newProps.data.view, props.data.view)) {
				setView(newProps.data.view);
			}
		} else {
			init(newProps);
		}
		props = newProps;
		animate();
	}

	controls.addEventListener('change', () => {
		if (drawing === false) {
			requestAnimationFrame(animate);
			drawing = true;
		}
		props.onMove({position: camera.position.toArray(), target: controls.target.toArray()});
	});

	var mm = Rx.Observable.fromEvent(el, 'mousemove');
	var mmSub = mm.subscribe(ev => {
		var rect = ev.target.getBoundingClientRect(); // XXX cache this?
		mouse.x = ev.clientX - rect.left;
		mouse.y = ev.clientY - rect.top;
		onChange();
	});

	// initial draw must wait for loading
	THREE.DefaultLoadingManager.onLoad = () => {
		animate();
		loaded();
	};

	return {update, mm: mmSub};
}

class MapDrawing extends Component {
	shouldComponentUpdate() {
		return false;
	}

	startOrUpdate(props) {
		if (_.every(props.data.columns, _.identity)) {
			if (this.update) {
				this.update(props);
			} else {
				// set this.update and this.mm
				_.extend(this, points(this.refs.map, props));
			}
		}
	}

	componentDidMount() {
		var {onTooltip, onMove, data} = this.props;
		var events = rxEvents(this, 'move');
		this.move = events.move
			.debounceTime(1000)
			.subscribe(onMove);

		this.startOrUpdate({onTooltip, onMove: this.on.move, data});
	}

	componentWillReceiveProps(newProps) {
		var {onTooltip, data} = newProps;
		if (!_.isEqual(this.props, newProps)) {
			this.startOrUpdate({onTooltip, onMove: this.on.move, data});
		}
	}

	componentWillUnmount() {
		drawing = false; // XXX is this necessary?
		this.move.unsubscribe();
		if (this.mm) {
			this.mm.unsubscribe();
		}
	}

	render() {
		return canvas({ref: 'map', className: styles.graph});
	}
}

var mapDrawing = el(MapDrawing);

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

class RadeonTest extends PureComponent {
	shouldComponentUpdate() {
		return false;
	}
	componentDidMount() {
		var el = this.refs.canvas;
		var width = 100, height = 100;

		el.width = width;
		el.height = height;
		var renderer = new THREE.WebGLRenderer({canvas: el, antialias: true});
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setSize(width, height, {updateStyle: false});

		var scene = new THREE.Scene();
		scene.background = new THREE.Color(0xffffff);
		var sprite = new THREE.TextureLoader().load(disc);

		var material = new THREE.PointsMaterial({size: 30,
			color: 0xff0000,
			map: sprite,
			transparent: false,
			alphaTest: 0.5});
		var geometry = new THREE.BufferGeometry();
		geometry.setAttribute('position',
			new THREE.Float32BufferAttribute([0, 20, 0, 0, 0, 0, 20, 20, 0], 3));
		scene.add(new THREE.Points(geometry, material));

		var camera = new THREE.PerspectiveCamera(perspective, width / height, 2, 4000);
		camera.position.set(0, 0, 39);
		camera.lookAt(new THREE.Vector3(0, 0, 0));
		loader.then(() => {
			renderer.render(scene, camera);
		});
		Rx.Observable.fromEvent(el, 'mousemove')
			.filter(ev => ev.shiftKey)
			.subscribe(ev => {
				var pos = camera.position.toArray();
				pos[0] -= ev.movementX;
				pos[1] += ev.movementY;
				camera.position.fromArray(pos);
				renderer.render(scene, camera);
			});
	}
	render() {
		return canvas({ref: 'canvas', style: {width: 100, height: 100, display: 'block', border: '1px solid black'}});
	}
}

var radeonTest = el(RadeonTest);

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
	state = {
		showRadeonTest: false
	}
	componentWillMount() {
		var showRadeonTest = hidden.create('showRadeonTest', 'Radeon test', {
			onChange: v => this.setState({showRadeonTest: v}),
			default: false
		});
		this.setState({showRadeonTest});
	}
	componentWillUnmount() {
		hidden.delete('showRadeonTest');
	}
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
			this.state.showRadeonTest ? radeonTest() : null,
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

export class Map extends PureComponent {
	state = {
		tooltip: null
	}
	componentWillMount() {
		debug = hidden.create('mapDebug', 'Show pick map', {
			onChange: v => debug = v,
			default: false
		});
		hidden.create('radeonPicker', 'Dump radeon picker',
			{onClick: () => dumpRadeonPicker()});
	}
	componentWillUnmount() {
		hidden.delete('mapDebug');
		hidden.delete('radeonPicker');
	}
	onMove = pos => {
		this.props.callback(['map-view', pos]);
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
			view = _.get(mapState, 'view'),
			labels = _.get(params, 'dimension', []),
			data = {columns, colorColumn, colors, hideColors, labels, view};

		return dialog({active: true, actions, onEscKeyDown: this.onHide,
					onOverlayClick: this.onHide,
					className: styles.mainDialog,
					theme: {overlay: styles.dialogOverlay,
						body: styles.dialogBody
					}},
				div({className: styles.content},
					div({className: styles.graphWrapper},
						getStatusView(loading, error, this.onReload),
						mapDrawing({onTooltip, onMove, data})),
					sideBar({tooltip, state, maps: availableMaps, mapValue,
						onColor, onMap, onCode, onHideAll, onShowAll})));
	}
}
