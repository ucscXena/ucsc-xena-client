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

import vs from './scatterplot-layer-vertex.glsl';
import fs from './scatterplot-layer-fragment.glsl';

const DEFAULT_COLOR = [0, 0, 0, 255];

const defaultProps = {
	radiusUnits: 'meters',
	radiusScale: {type: 'number', min: 0, value: 1},
	radiusMinPixels: {type: 'number', min: 0, value: 0}, //  min point radius in pixels
	radiusMaxPixels: {type: 'number', min: 0, value: Number.MAX_SAFE_INTEGER}, // max point radius in pixels

	lineWidthUnits: 'meters',
	lineWidthScale: {type: 'number', min: 0, value: 1},
	lineWidthMinPixels: {type: 'number', min: 0, value: 0},
	lineWidthMaxPixels: {type: 'number', min: 0, value: Number.MAX_SAFE_INTEGER},

	stroked: false,
	filled: true,
	billboard: false,
	antialiasing: true,

	getPosition: {type: 'accessor', value: x => x.position},
	getRadius: {type: 'accessor', value: 1},
	getColor: {type: 'accessor', value: DEFAULT_COLOR},
	getLineWidth: {type: 'accessor', value: 1},
};

/** Render circles at given coordinates. */
class ScatterplotLayer extends Layer {
	static defaultProps = defaultProps;
	static layerName = 'XenaScatterplotLayer';

	getShaders() {
		var {decl, color} = this.props;
		return {
			...super.getShaders({vs, fs, modules: [scales, project32, picking],
			inject: {
				'vs:#decl': decl,
				'vs:DECKGL_FILTER_COLOR': color
			}
		})};
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
			instanceRadius: {
				size: 1,
				transition: true,
				accessor: 'getRadius',
				defaultValue: 1
			},
			instanceColors: {
				size: this.props.colorFormat.length,
				transition: true,
				normalized: true,
				type: GL.UNSIGNED_BYTE,
				accessor: 'getColor',
				defaultValue: [0, 0, 0, 255]
			},
			instanceLineWidths: {
				size: 1,
				transition: true,
				accessor: 'getLineWidth',
				defaultValue: 1
			},
			...attributes
		});
	}

	updateState(params) {
		super.updateState(params);

		if (params.changeFlags.extensionsChanged) {
			const {gl} = this.context;
			this.state.model?.delete();
			this.state.model = this._getModel(gl);
			this.getAttributeManager().invalidateAll();
		}
	}

	draw({uniforms}) {
		const {radiusUnits, radiusScale, radiusMinPixels, radiusMaxPixels, stroked,
			filled, billboard, antialiasing, lineWidthUnits, lineWidthScale,
			lineWidthMinPixels, lineWidthMaxPixels } = this.props,
			uniformProps = pick(this.props, this.props.uniforms || []);

		this.state.model
			.setUniforms(uniforms)
			.setUniforms({
				stroked: stroked ? 1 : 0,
				filled,
				billboard,
				antialiasing,
				radiusUnits: UNIT[radiusUnits],
				radiusScale,
				radiusMinPixels,
				radiusMaxPixels,
				lineWidthUnits: UNIT[lineWidthUnits],
				lineWidthScale,
				lineWidthMinPixels,
				lineWidthMaxPixels,
				...uniformProps
			})
			.draw();
	}

	_getModel(gl) {
		// a square that minimally cover the unit circle
		const positions = [-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0];

		return new Model(gl, {
			...this.getShaders(),
			id: this.props.id,
			geometry: new Geometry({
				drawMode: GL.TRIANGLE_FAN,
				vertexCount: 4,
				attributes: {
					positions: {size: 3, value: new Float32Array(positions)}
				}
			}),
			isInstanced: true
		});
	}
}

export var scatterplotLayer = ({id, ...props}) =>
	Let(({getColor, getValues0, getValues1} = props,
		{key, ...layerProps} = getColor && getValues1 ? floatOrdinalProps :
			getValues0 && getValues1 ? floatFloatProps :
			getValues0 ? floatProps :
			ordinalProps) =>
		new ScatterplotLayer({id: id + key, ...props, ...layerProps}));
