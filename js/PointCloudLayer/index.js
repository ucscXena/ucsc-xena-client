// Portions copyright 2023 The Regents of the University of California
//
// Copyright (c) 2015 - 2017 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

var {Let, pick} = require('../underscore_ext').default;
import {Layer, project32, picking, UNIT} from '@deck.gl/core';
import GL from '@luma.gl/constants';
import {Model, Geometry} from '@luma.gl/core';

import vs from './point-cloud-layer-vertex.glsl';
import fs from './point-cloud-layer-fragment.glsl';

const DEFAULT_COLOR = [0, 255, 0, 255];
const DEFAULT_NORMAL = [0, 0, 1];

const defaultProps = {
  sizeUnits: 'pixels',
  pointSize: {type: 'number', min: 0, value: 10}, //  point radius in pixels

  getPosition: {type: 'accessor', value: x => x.position},
  getNormal: {type: 'accessor', value: DEFAULT_NORMAL},
  getColor: {type: 'accessor', value: DEFAULT_COLOR},

  material: false
};

var value0Attr =
	{values0: { size: 1, type: GL.FLOAT, accessor: 'getValues0' }};

var value0Decl = `
	attribute float values0;
	uniform bool log0;
	uniform float lower0;
	uniform float upper0;`;

var value1Attr =
	{values1: { size: 1, type: GL.FLOAT, accessor: 'getValues1' }};

var value1Decl = `
	attribute float values1;
	uniform float lower1;
	uniform float upper1;`;

var ordinalDecl = `
	attribute vec4 instanceColors;`;

var ordinalAttr =
	{instanceColors: {
		size: 4,
		type: GL.UNSIGNED_BYTE,
		normalized: true,
		transition: true,
		accessor: 'getColor'}};

var floatProps = {
	key: 'float',
	decl: value0Decl,
	// XXX add opacity, from deckgl shader standards?
	color: `
		if (log0) {
			float m = 1. / (log2(upper0) - log2(lower0));
			float b = 1. - m * log2(upper0);
			if (values0 < lower0) {
				color.a = 0.;
			} else if (values0 > upper0) {
				color.a = 1.;
			} else {
				color.a = m * log2(values0) + b;
			}
		} else {
			if (values0 < lower0) {color.a = 0.;} else
			if (values0 > upper0) {color.a = 1.;}
			else {color.a = (values0 - lower0) / (upper0 - lower0);}
		}
		color.r = 1.;
		color.g = 0.;
		color.b = 0.;`,
	attributes: value0Attr,
	uniforms: ['lower0', 'upper0', 'log0'],
};

var ordinalProps = {
	key: 'ordinal',
	decl: ordinalDecl,
	// XXX add opacity, from deckgl shader standards?
	color: `color = vec4(instanceColors.rgb, 1.);`,
	attributes: ordinalAttr
};

var floatFloatProps = {
	key: 'floatfloat',
	decl: value0Decl + value1Decl,
	// XXX add opacity, from deckgl shader standards?
	color: `
		float r;
		if (values0 < lower0) {r = 0.;} else
		if (values0 > upper0) {r = 1.;}
		else {r = (values0 - lower0) / (upper0 - lower0);}
		float b;
		if (values1 < lower1) {b = 0.;} else
		if (values1 > upper1) {b = 1.;}
		else {b = (values1 - lower1) / (upper1 - lower1);}
		color.r = r;
		color.g = 0.;
		color.b = b;
		color.a = max(r, b);`,
	attributes: {...value0Attr, ...value1Attr},
	uniforms: ['lower0', 'upper0', 'lower1', 'upper1'],
};

var floatOrdinalProps = {
	key: 'floatordinal',
	decl: ordinalDecl + value1Decl,
	// XXX add opacity, from deckgl shader standards?
	color: `
		color = instanceColors;
		if (values1 < lower1) {color.a = 0.;} else
		if (values1 > upper1) {color.a = 1.;}
		else {color.a = (values1 - lower1) / (upper1 - lower1);}
	`,
	attributes: {...value1Attr, ...ordinalAttr},
	uniforms: ['lower1', 'upper1'],
};

/** Render a point cloud with 3D positions, normals and colors. */
class XenaPointCloudLayer extends Layer {
	static layerName = 'XenaPointCloudLayer';
	static defaultProps = defaultProps;

	getShaders() {
		var {decl, color} = this.props;
		return {
			...super.getShaders({vs, fs, modules: [project32, picking]}),
			inject: {
				'vs:#decl': decl,
				'vs:DECKGL_FILTER_COLOR': color
			}
		};
	}

	initializeState() {
		var {attributes} = this.props;
		this.getAttributeManager().addInstanced({
			instancePositions: {
				size: 3,
				type: GL.DOUBLE,
				fp64: this.use64bitPositions(),
				transition: true,
				accessor: 'getPosition'
			},
			instanceNormals: {
				size: 3,
				transition: true,
				accessor: 'getNormal',
				defaultValue: DEFAULT_NORMAL
			},
			...attributes
		});
	}

	updateState(params) {
		const {changeFlags} = params;
		super.updateState(params);
		if (changeFlags.extensionsChanged) {
			const {gl} = this.context;
			this.state.model?.delete();
			this.state.model = this._getModel(gl);
			this.getAttributeManager().invalidateAll();
		}
	}

	draw({uniforms}) {
		const {pointSize, sizeUnits} = this.props,
			uniformProps = pick(this.props, this.props.uniforms || []);

		this.state.model
			.setUniforms(uniforms)
			.setUniforms({
				sizeUnits: UNIT[sizeUnits],
				radiusPixels: pointSize,
				...uniformProps
			})
			.draw();
	}

	_getModel(gl) {
		// a triangle that minimally cover the unit circle
		const positions = [];
		for (let i = 0; i < 3; i++) {
			const angle = (i / 3) * Math.PI * 2;
			positions.push(Math.cos(angle) * 2, Math.sin(angle) * 2, 0);
		}

		return new Model(gl, {
			...this.getShaders(),
			id: this.props.id,
			geometry: new Geometry({
				drawMode: GL.TRIANGLES,
				attributes: {
					positions: new Float32Array(positions)
				}
			}),
			isInstanced: true
		});
	}
}

export var pointCloudLayer = ({id, ...props}) =>
	Let(({getColor, getValues0, getValues1} = props,
		{key, ...layerProps} = getColor && getValues1 ? floatOrdinalProps :
			getValues0 && getValues1 ? floatFloatProps :
			getValues0 ? floatProps :
			ordinalProps) =>
		new XenaPointCloudLayer({id: id + key, ...props, ...layerProps}));
