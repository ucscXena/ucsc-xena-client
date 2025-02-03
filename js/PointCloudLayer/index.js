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
import {scales, floatProps, ordinalProps, floatFloatProps, floatOrdinalProps}
	from '../webglScales';

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

  material: false,
  radiusMin: 0
};

/** Render a point cloud with 3D positions, normals and colors. */
class XenaPointCloudLayer extends Layer {
	static layerName = 'XenaPointCloudLayer';
	static defaultProps = defaultProps;

	getShaders() {
		var {decl, color, radiusMin} = this.props;
		return {
			...super.getShaders({vs: vs(radiusMin), fs, modules: [scales, project32, picking]}),
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
