import {Mesh, Color, Group} from 'three';
import {MeshLine, MeshLineMaterial} from 'three.meshline';
var _ = require('../underscore_ext').default;

// XXX how to dispose of geometries and materials? Also,
// can we re-use the materials?
var axisMesh = _.curry((resolution, color, points) => {
	const line = new MeshLine();
	line.setPoints(points);
	const material = new MeshLineMaterial({
		useMap: false,
		color: new Color(color),
		resolution,
		opacity: 1,
		sizeAttenuation: false,
		lineWidth: 5
	});
	return new Mesh(line, material);
});

var nlines = 4;
export default class Axes3d extends Group {
	constructor(resolution, min, max) {
		var step = (max - min) / (nlines - 1),
			mesh = axisMesh(resolution, 0xD0D0D0),
			offsets = _.range(1, nlines).map(i => min + i * step);

		var zmesh = offsets.map(offset =>
				[mesh([min, offset, min, max, offset, min]),
				mesh([min, min, offset, max, min, offset])])
			.flat().concat([
				mesh([min, min, min, max, min, min])]);

		var ymesh = offsets.map(offset =>
				[mesh([min, min, offset, min, max, offset]),
				 mesh([offset, min, min, offset, max, min])])
			.flat().concat([
				 mesh([min, min, min, min, max, min])]);

		var xmesh = offsets.map(offset =>
				[mesh([offset, min, min, offset, min, max]),
				 mesh([min, offset, min, min, offset, max])])
			.flat().concat([
				mesh([min, min, min, min, min, max])]);

		super();
		xmesh.forEach(m => this.add(m));
		ymesh.forEach(m => this.add(m));
		zmesh.forEach(m => this.add(m));
	}
//	dispose() {
//		this.geometry.dispose();
//		this.material.dispose();
//	}
}
