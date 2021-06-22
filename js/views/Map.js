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
var konami = require('../konami');

var debug = false;

var drawing = false; // XXX singleton

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
var lHeight = 180;
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

// threshold for mouse clicks
var thresh = 2;
var near = ([ev0, ev1]) =>
	Math.abs(ev0.clientX - ev1.clientX) < thresh &&
		Math.abs(ev0.clientY - ev1.clientY) < thresh;

//var maxZoom = 100; // for 2d orthographic view

var perspective = 55;

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

function points(el, props) {
	var {height, width} = el.getBoundingClientRect(); // XXX is this correct?
	var resolution = new THREE.Vector2(width, height),
		pointGroups = [], // zero or one, like a 'maybe'.
		pickingGroups = [], // zero or one, like a 'maybe'.
		axes = [],
		labels = [],
		twoD,
		size;

	var mouse = new THREE.Vector2();
	var sprite = new THREE.TextureLoader().load(disc);
	var pickingSprite = new THREE.TextureLoader().load(picker);
	var scene = new THREE.Scene();
	var pickingScene = new THREE.Scene();
	var pickingTarget = new THREE.WebGLRenderTarget(1, 1);

	scene.background = new THREE.Color(0xffffff);

	var renderer = new THREE.WebGLRenderer({canvas: el, antialias: true});
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(width, height, {updateStyle: false});

	var camera = new THREE.PerspectiveCamera(perspective, width / height, 2, 4000);
	var controls = new OrbitControls(camera, renderer.domElement);
	controls.enableDamping = true;

	el.style.touchAction = 'none'; // XXX render this in react?

	function pick() {
		camera.setViewOffset(renderer.domElement.width, renderer.domElement.height,
			mouse.x * window.devicePixelRatio | 0,
			mouse.y * window.devicePixelRatio | 0, 1, 1 );
		renderer.setRenderTarget(pickingTarget);
		renderer.render(pickingScene, camera);

		camera.clearViewOffset(); // clear the view offset
		const pixelBuffer = new Uint8Array(4); // single pixel
		renderer.readRenderTargetPixels(pickingTarget, 0, 0, 1, 1, pixelBuffer);

		//interpret the pixel as an ID
		const id = pixelBuffer[0] << 16 | pixelBuffer[1] << 8 | pixelBuffer[2];
		renderer.setRenderTarget(null);
		return id;
	}

	var toggle = false;
	function render() {
		if (toggle) {
			renderer.render(pickingScene, camera);
		} else {
			renderer.render(scene, camera);
		}
		if (debug) {
			toggle = !toggle;
		}
		controls.update();
	}

	function animate() {
		drawing = false;
		var point1 = new THREE.Vector3();
		var point2 = new THREE.Vector3();
		point1.setFromMatrixPosition(camera.matrixWorld);
//		if (!twoD) {
			labels.forEach(label => {
				label.updateMatrix();
				point2.setFromMatrixPosition(label.matrixWorld);
				var dist = point1.distanceTo(point2);
				var s = dist / 3000;
				label.scale.set(s, s, s);
				label.updateMatrix();
			});
//		}

		render();
	}

	var lastColor;
	var lastColorI;
	var black = new THREE.Color(0x000000);

	function onClick(ev)  {
		var rect = ev.target.getBoundingClientRect();

		mouse.x = ev.clientX - rect.left;
		mouse.y = ev.clientY - rect.top;

		var color = pointGroups[0].geometry.getAttribute('color').array;
		if (lastColor) {
			color[lastColorI * 3] = lastColor[0];
			color[lastColorI * 3 + 1] = lastColor[1];
			color[lastColorI * 3 + 2] = lastColor[2];
			lastColor = undefined;
		}

		var i = pick();
		if (i != null) {
			lastColorI = i;
			lastColor = [
				color[i * 3],
				color[i * 3 + 1],
				color[i * 3 + 2]];
			color[i * 3] = black.r;
			color[i * 3 + 1] = black.g;
			color[i * 3 + 2] = black.b;

			props.onTooltip(i);
		} else {
			props.onTooltip(null);
		}
		pointGroups[0].geometry.getAttribute('color').needsUpdate = true;

		animate();
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

	function init(props) {
		twoD = props.data.columns.length === 2;
		var min = _.minnull(props.data.columns.map(_.minnull)),
			max = _.maxnull(props.data.columns.map(_.maxnull));

		size = (max - min) / 50;

		setGroups(props);

		// on change of map, we need to recreate axes, labels, and tooltip.
		axes.forEach(a => scene.remove(a));
		axes = [new Axes3d(resolution, min, max, props.data.columns.length)];
		axes.forEach(a => scene.add(a));

		labels.forEach(l => scene.remove(l));
		labels = _.mmap(props.data.labels, [labelx, labely, labelz],
			(label, fn) => fn(label, min, max, twoD));
		labels.forEach(l => scene.add(l));

		var c = (max + min) / 2;
		if (twoD) {
			camera.position.z = c + (max - min);
			camera.position.y = c;
			camera.position.x = c;
		} else {
			camera.position.z = min + 2 * (max - min);
			camera.position.y = max + (max - min);
			camera.position.x = max + (max - min);
		}

		if (twoD) {
			controls.maxDistance =  2 * (max - min);
			controls.minDistance = .10 * (max - min);
		} else {
			controls.maxDistance =  2 * (max - min);
			controls.minDistance = .25 * (max - min);
		}
		controls.target = new THREE.Vector3(c, c, twoD ? 0 : c);
		if (twoD) {
			controls.enableRotate = false;
		}

		controls.update();
		// Force update so we can compute camera distance from labels on the
		// first render.
		scene.updateMatrixWorld();
	}

	init(props); // assigns controls

	function update(newProps) {
		if (_.isEqual(newProps.data.columns, props.data.columns)) {
			setGroups(newProps);
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
	});

	// 'onclick' event will fire even if there is a drag, which
	// aliases with camera navigation controls. So, we have to spin
	// our own click event from mouse up & down.
	var md = Rx.Observable.fromEvent(el, 'pointerdown'), // XXX pointer vs mouse?
		mu = Rx.Observable.fromEvent(el, 'pointerup');

	var click = md.flatMap((down) => mu.map(up => [down, up]))
		.filter(near).map(([, up]) => up);

	click.subscribe(onClick);

	// initial draw must wait for loading
	THREE.DefaultLoadingManager.onLoad = () => {
		animate();
	};

	return update;
}

class MapDrawing extends Component {
	shouldComponentUpdate() {
		return false;
	}

	componentDidMount() {
		var {onTooltip, data} = this.props;
		this.update = points(this.refs.map, {onTooltip, data});
	}

	componentWillReceiveProps(newProps) {
		var {onTooltip, data} = newProps;
		if (!_.isEqual(this.props, newProps)) {
			this.update({onTooltip, data});
		}
	}

	componentWillUnmount() {
		drawing = false; // XXX is this necessary?
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
		div({className: styles.column},
			label(textNode('Map')), div(sel)));
}

export class SideBar extends PureComponent {
	onColor = ev => {
		this.props.onColor(ev.currentTarget.value);
	}
	onMap = ev => {
		this.props.onMap(this.props.maps[ev.currentTarget.value]);
	}
	render() {
		var {tooltip, maps, mapValue, state} = this.props;

		return div({className: styles.sideBar},
			mapSelector(maps, mapValue, this.onMap),
			colorSelector(state, this.onColor),
			tooltip && p(`Sample ${tooltip.sampleID}`),
			tooltip && tooltip.valTxt ? p(`Value: ${tooltip.valTxt}`) : null);
	}
}
var sideBar = el(SideBar);


export class Map extends PureComponent {
	state = {
		tooltip: null
	}
	componentWillMount() {
		var asciiC = 67;
		this.ksub = konami(asciiC).subscribe(() => {
			debug = true;
		});
	}
	componentWillUnmount() {
		this.ksub.unsubscribe();
	}
	onTooltip = i => {
		if (i === null) {
			this.setState({tooltip: null});
			return;
		}
		var {state} = this.props;
		var sampleID = state.cohortSamples[i];
		var colorID = state.map.colorColumn || 'none';
		var value, valTxt;
		if (colorID !== 'none') {
			value = state.data[colorID].req.values[0][i];
			valTxt = _.get(state.data[colorID].codes, value, String(value));
		}
		// XXX dimensions

		this.setState({tooltip: {sampleID, valTxt}});
	}
	onColor = column => {
		this.props.callback(['map-color', column]);
	}
	onMap = map => {
		this.props.callback(['map-select', map]);
	}
	onHide = () => {
		this.props.callback(['map', false]);
	}
	render() {
		var actions = [
			{
				children: [<i className='material-icons'>close</i>],
				className: styles.mainDialogClose,
				onClick: this.onHide
			}],
			{onTooltip, onColor, onMap, state: {tooltip}, props: {state}} = this;

		var mapState = _.get(state, 'map'),
			[dsID, params] = _.get(mapState, 'map', []),
			mapData = _.getIn(mapState, ['data', dsID]),
			columns = _.get(params, 'dimension')
				.map(d => _.getIn(mapData, [d, 'req', 'values', 0])),
			colorId = _.get(mapState, 'colorColumn'),
			colorColumn = _.getIn(state, ['data', colorId,
				'req', 'values', 0]),
			colors = _.getIn(state, ['columns', colorId, 'colors', 0]),
			availableMaps = state.map.available,
			mapValue = _.findIndex(availableMaps,
				_.partial(_.isEqual, _.get(mapState, 'map'))),
			labels = _.get(params, 'dimension', []);

		var data = _.every(columns, _.identity) ?
			{columns, colorColumn, colors, labels} : undefined;

		return dialog({active: true, actions, onEscKeyDown: this.onHide,
					onOverlayClick: this.onHide,
					className: styles.mainDialog,
					theme: {wrapper: styles.dialogWrapper,
						overlay: styles.dialogOverlay}},
				div({className: styles.content},
					data ? mapDrawing({onTooltip, data}) : 'spin spin spin',
					sideBar({tooltip, state, maps: availableMaps, mapValue, onColor, onMap})));
	}
}
