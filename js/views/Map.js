var React = require('react');
import {Box, Button, Dialog, DialogContent, Icon, IconButton} from '@material-ui/core';
import {Component} from 'react';
import PureComponent from '../PureComponent';
import styles from './Map.module.css';
import {canvas, div, el, label, option, p, select, textNode}
	from '../chart/react-hyper.js';
import * as THREE from 'three/build/three';
import {OrbitControls} from './OrbitControls';
import disc from './disc.png';
import picker from './picker.png';
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
import {xenaColor} from '../xenaColor';

var debug = false;

var drawing = false; // XXX singleton
var dumpRadeonPicker;

var box = el(Box);
var button = el(Button);
var dialog = el(Dialog);
var dialogContent = el(DialogContent);
var icon = el(Icon);

// Styles
var sxCloseButton = {
	alignSelf: 'flex-start',
	color: xenaColor.BLACK_38,
	position: 'absolute',
	right: 8,
	top: 8,
	'&:hover': {
		backgroundColor: xenaColor.BLACK_6,
	},
};

var ringTexture = (function () {
	const ctx = document.createElement('canvas').getContext('2d');
	ctx.canvas.width = 32;
	ctx.canvas.height = 32;
	ctx.fillStyle = '#FFF';
	ctx.arc(16, 16, 15.62, 0, Math.PI * 2, false);
	ctx.arc(16, 16, 13, 0, Math.PI * 2, true);
	ctx.fill();

	return new THREE.CanvasTexture(ctx.canvas);
}());

var circleTexture = (function () {
	const ctx = document.createElement('canvas').getContext('2d');
	ctx.canvas.width = 32;
	ctx.canvas.height = 32;
	ctx.fillStyle = '#FFF';
	ctx.arc(16, 16, 15.62, 0, Math.PI * 2, false);
	ctx.fill();

	return new THREE.CanvasTexture(ctx.canvas);
}());

// https://gamedev.stackexchange.com/questions/53601/why-is-90-horz-60-vert-the-default-fps-field-of-view
var perspective = 60;

function particles(sprite, size, vertices, color) {
	const geometry = new THREE.BufferGeometry();

	var nsize = size / Math.tan(perspective / 2 / 180 * Math.PI);
	geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
	geometry.setAttribute('color', new THREE.Float32BufferAttribute(color, 3));
	var material = new THREE.PointsMaterial({size: nsize,
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

// height of viewport, distance from camera, size of object. Used to
// get projected height of rendered marker, so we can change it for different
// zooms.
var projectedSize = (height, distance, size) =>
	(height / 2) * size / (distance * Math.tan(perspective / 2 / 180 * Math.PI));

function makeImage({path, size, offset = [0, 0], image_scalef: scale}) {
	var dsize = size.map(s => s / scale),
		texture = new THREE.TextureLoader().load(path),
		material = new THREE.MeshBasicMaterial({map: texture}),
		geo = new THREE.PlaneGeometry(...dsize),
		mesh = new THREE.Mesh(geo, material);
	// PlaneGeometry is positioned by its center, so shift it by
	// half. Also, move it behind the data.
	geo.translate(dsize[0] / 2 - offset[0] / scale, dsize[1] / 2 - offset[1] / scale, -1);
	texture.flipY = false;
	return mesh;
}

var loaded;
var loader = new Promise(resolve => loaded = resolve);

function points(el, props) {
	var pointGroups = [], // zero or one, like a 'maybe'.
		pickingGroups = [], // zero or one, like a 'maybe'.
		axes = [],
		labels = [],
		image = [],
		mouse = new THREE.Vector2(),
		size;

	var sprite;
	// XXX move picking stuff into separate context
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
		// XXX do we need to update size?
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

		sprite = props.data.image ? ringTexture : new THREE.TextureLoader().load(disc);
		size = props.data.size || (max - min) / 50; // XXX this is probably wrong

		setGroups(props);

		// on change of map, we need to recreate axes, labels, and tooltip.
		axes.forEach(a => scene.remove(a));
		axes = [new Axes3d(resolution, min, max, props.data.columns.length)];
		axes.forEach(a => scene.add(a));

		labels.forEach(l => scene.remove(l));
		labels = _.mmap(props.data.labels, [labelx, labely, labelz],
			(label, fn) => fn(label, min, max, twoD));
		labels.forEach(l => scene.add(l));

		image.forEach(i => scene.remove(i));
		image = props.data.image ? [makeImage(props.data.image)] : [];
		image.forEach(i => scene.add(i));

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

		if (props.data.image) {
			let [, , z] = camera.position.toArray(),
				dotHeight = projectedSize(height, z, props.data.size);

			pointGroups.forEach(points => {
				if (dotHeight < 10 && points.material.map === ringTexture) {
					sprite = points.material.map = circleTexture;
					points.material.needsUpdate = true;
				} else if (dotHeight > 10 && points.material.map === circleTexture) {
					sprite = points.material.map = ringTexture;
					points.material.needsUpdate = true;
				}
			});
		}

		if (props.onMove) {
			props.onMove({position: camera.position.toArray(),
				target: controls.target.toArray()});
		}
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

	UNSAFE_componentWillReceiveProps(newProps) {//eslint-disable-line camelcase
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
	UNSAFE_componentWillMount() {//eslint-disable-line camelcase
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
				button({color: 'default', disableElevation: true, onClick: this.props.onHideAll, variant: 'contained'}, 'Hide all'),
				button({color: 'default', disableElevation: true, onClick: this.props.onShowAll, variant: 'contained'}, 'Show all')) : null,
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

function setHost(dsID, image) {
	var {host} = JSON.parse(dsID);
	return image && _.assoc(image, 'path', host + '/download/' + image.path);
}

export class Map extends PureComponent {
	state = {
		tooltip: null
	}
	UNSAFE_componentWillMount() {//eslint-disable-line camelcase
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
	render() {
		var {onTooltip, onMove, onColor, onCode, onHideAll, onShowAll, onMap,
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
			size = params.spot_diameter,
			// don't create an image parameter while doing this
			image = setHost(dsID, _.getIn(params, ['image', 0])),
			data = {columns, colorColumn, size, colors,
				hideColors, labels, view, image};

		return dialog({fullWidth: true, maxWidth: 'xl', open: mapState.open, onClose: this.onHide, PaperProps: {style: {height: '100%'}}},
			box({component: IconButton, onClick: this.onHide, sx: sxCloseButton}, icon("close")),
				dialogContent({className: styles.content},
					div({className: styles.graphWrapper},
						getStatusView(loading, error, this.onReload),
						mapDrawing({onTooltip, onMove, data})),
					sideBar({tooltip, state, maps: availableMaps, mapValue,
						onColor, onMap, onCode, onHideAll, onShowAll})));
	}
}
