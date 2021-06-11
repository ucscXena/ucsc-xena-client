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
var dialog = el(Dialog);
var _ = require('../underscore_ext').default;
import Axes3d from './Axes3d';
import Rx from '../rx';
import {suitableColumns} from '../chart/utils';
import * as colorScales from '../colorScales';

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

function tooltipPoint(size) {
	const geometry = new THREE.SphereGeometry(size / 6, 32, 32);
	var material = new THREE.MeshBasicMaterial({color: 0x000000});
	var tooltip = new THREE.Mesh(geometry, material);
	tooltip.visible = false;
	return tooltip;
}

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
function labelx(txt, min, max, height = 180) {
	var [aspect, material] = labelMaterial(txt, 24);
	var geometry = new THREE.BoxGeometry(height * aspect, height, 1)
		.translate(height * aspect / 2, height / 4, 0);
	return new THREE.Mesh(geometry, material)
		.translateX(max).translateY(min).translateZ(min);
}

function labely(txt, min, max, height = 180) {
	var [aspect, material] = labelMaterial(txt, 24);
	var geometry = new THREE.BoxGeometry(height * aspect, height, 1)
		.translate(height * aspect / 2, height / 4, 0);
	return new THREE.Mesh(geometry, material)
		.translateY(max).translateX(min).translateZ(min)
		.rotateZ(Math.PI / 2);
}

function labelz(txt, min, max, height = 180) {
	var [aspect, material] = labelMaterial(txt, 24);
	var geometry = new THREE.BoxGeometry(height * aspect, height, 1)
		.translate(-height * aspect / 2, height / 4, 0);
	return new THREE.Mesh(geometry, material)
		.translateZ(max).translateX(min).translateY(min)
		.rotateY(Math.PI / 2);
}

// threshold for mouse clicks
var thresh = 2;
var near = ([ev0, ev1]) =>
	Math.abs(ev0.clientX - ev1.clientX) < thresh &&
		Math.abs(ev0.clientY - ev1.clientY) < thresh;

var twoD = false;
var maxZoom = 100; // for 2d view

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
		axes = [],
		tooltip = [],
		labels = [],
		size;

	var raycaster = new THREE.Raycaster();
	var mouse = new THREE.Vector2();
	var sprite = new THREE.TextureLoader().load(disc);
	var scene = new THREE.Scene();

	scene.background = new THREE.Color(0xffffff);

	var renderer = new THREE.WebGLRenderer({canvas: el, antialias: true});
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(width, height, {updateStyle: false});

	var camera = new THREE.PerspectiveCamera(perspective, width / height, 2, 4000);
	var controls = new OrbitControls(camera, renderer.domElement);
	controls.enableDamping = true;

	el.style.touchAction = 'none'; // XXX render this in react?

	function render() {
		renderer.render(scene, camera);
		return controls.update();
	}

	function animate() {
		drawing = false;
		var point1 = new THREE.Vector3();
		var point2 = new THREE.Vector3();
		point1.setFromMatrixPosition(camera.matrixWorld);
		if (!twoD) {
			labels.forEach(label => {
				label.updateMatrix();
				point2.setFromMatrixPosition(label.matrixWorld);
				var dist = point1.distanceTo(point2);
				var s = dist / 3000;
				label.scale.set(s, s, s);
				label.updateMatrix();
			});
		}

		render();
	}

	function onClick(ev)  {
		var rect = ev.target.getBoundingClientRect();
		mouse.x = (ev.clientX - rect.left) / rect.width * 2 - 1;
		mouse.y = -(ev.clientY - rect.top) / rect.height * 2 + 1;

		raycaster.setFromCamera(mouse, camera);

		// thresh 10 at zoom 1
		// thresh 1 at zoom 100
		// slope (1 - 10) / 99 = -9 / 99 = - 1 / 11
		// intersect = 10 + 1 / 11 ?
		// thresh = (10 + 1 / 11) -1 / 11 * zoom
		if (twoD) {
			raycaster.params.Points.threshold = (10 + 1 / 11) - 1 / 11 * camera.zoom;
		}

		var intersects = raycaster.intersectObjects(pointGroups, false);
		if (intersects.length) {
			var i = intersects[0].index;
			tooltip[0].position.fromArray(intersects[0].object.geometry.attributes.position.array, i * 3);
			tooltip[0].visible = true;
			props.onTooltip(intersects[0].index);
		} else {
			tooltip[0].visible = false;
			props.onTooltip(null);
		}
		animate();
	}

	function setGroups(props) {
		var {colorColumn} = props.data,
			colorScale = colorColumn ? colorScales.colorScale(props.data.colors)
				: () => '#00f000';

		pointGroups.forEach(g => scene.remove(g)); // empty the current groups
		pointGroups = [particles(sprite, size,
			_.times(props.data.columns[0].length,
				i => props.data.columns.map(c => c[i])).flat(),
			toColor(colorColumn || _.range(props.data.columns[0].length),
				colorScale))];
		pointGroups.forEach(g => scene.add(g));
	}

	function init(props) {
		var min = _.minnull(props.data.columns.map(_.minnull)),
			max = _.maxnull(props.data.columns.map(_.maxnull));

		size = (max - min) / 50;

		raycaster.params.Points.threshold = size / 5;
		setGroups(props);

		// on change of map, we need to recreate axes, labels, and tooltip.
		axes.forEach(a => scene.remove(a));
		axes = [new Axes3d(resolution, min, max)];
		axes.forEach(a => scene.add(a));

		labels.forEach(l => scene.remove(l));
		labels = _.mmap(props.data.labels, [labelx, labely, labelz],
			(label, fn) => fn(label, min, max));
		labels.forEach(l => scene.add(l));

		tooltip.forEach(t => scene.remove(t));
		tooltip = [tooltipPoint(size * 1.2, sprite)];
		tooltip[0].renderOrder = 2; // XXX layering is still odd. Not sure of sol'n.
		tooltip.forEach(t => scene.add(t));


		var c = (max + min) / 2;
//		twoD = true;
		if (twoD) {
			console.error('FIXME');
			// This changes controls, too.
			camera = new THREE.OrthographicCamera(-max, max, max, -max, 2, 4000);
			camera.position.z = min + 2 * (max - min);
			camera.position.y = c;
			camera.position.x = c;
			pointGroups.forEach(target => {
				target.material.size = 10;
			});
			tooltip[0].material.size = 12;
			raycaster.params.Points.threshold = 1;
		} else {
//			camera = new THREE.PerspectiveCamera(perspective, width / height, 2, 4000);
			camera.position.z = min + 2 * (max - min);
			camera.position.y = max + (max - min);
			camera.position.x = max + (max - min);
		}

		if (twoD) {
			controls.maxZoom = maxZoom;
			controls.minZoom = 1;
		} else {
			controls.maxDistance =  2 * (max - min);
			controls.minDistance = .25 * (max - min);
		}
		controls.target = new THREE.Vector3(c, c, c);
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
	onTooltip = i => {
		if (i === null) {
			this.setState({tooltip: null});
			return;
		}
		var {state} = this.props;
		var sampleID = state.cohortSamples[i];
		var colorID = state.map.colorColumn;
		var value, valTxt;
		if (colorID) {
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
