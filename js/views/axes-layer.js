// Copyright (c) 2020 Urban Computing Foundation
// See deck.gl 8.5 MIT license
//
// Portions Copyright The Regents of the University of California

import {Layer} from '@deck.gl/core';
import GL from '@luma.gl/constants';
import {Model, Geometry} from '@luma.gl/core';


import fragmentShader from './axes-fragment.glsl';
import gridVertex from './grid-vertex.glsl';

/* Constants */
const DEFAULT_TICK_COUNT = 6;

const defaultProps = {
  data: [],
  xScale: null,
  yScale: null,
  zScale: null,
  xTicks: DEFAULT_TICK_COUNT,
  yTicks: DEFAULT_TICK_COUNT,
  zTicks: DEFAULT_TICK_COUNT,
  padding: 0,
  color: [0, 0, 0, 255],
};

/* Utils */
function flatten(arrayOfArrays) {
  const flatArray = arrayOfArrays.reduce((acc, arr) => acc.concat(arr), []);
  if (Array.isArray(flatArray[0])) {
    return flatten(flatArray);
  }
  return flatArray;
}

function getTicks(props) {
  const {axis} = props;
  let ticks = props[`${axis}Ticks`];
  const scale = props[`${axis}Scale`];

  if (!Array.isArray(ticks)) {
    ticks = scale.ticks(ticks);
  }

  return [
    ...ticks.map(t => ({
      value: t,
      position: scale(t),
    }))
  ];
}

/*
 * @classdesc
 * A layer that plots a surface based on a z=f(x,y) equation.
 *
 * @class
 * @param {Object} [props]
 * @param {Integer} [props.ticksCount] - number of ticks along each axis, see
      https://github.com/d3/d3-axis/blob/master/README.md#axis_ticks
 * @param {Number} [props.padding] - amount to set back grids from the plot,
      relative to the size of the bounding box
 * @param {d3.scale} [props.xScale] - a d3 scale for the x axis
 * @param {d3.scale} [props.yScale] - a d3 scale for the y axis
 * @param {d3.scale} [props.zScale] - a d3 scale for the z axis
 * @param {Number | [Number]} [props.xTicks] - either tick counts or an array of tick values
 * @param {Number | [Number]} [props.yTicks] - either tick counts or an array of tick values
 * @param {Number | [Number]} [props.zTicks] - either tick counts or an array of tick values
 * @param {Array} [props.color] - color of the gridlines, in [r,g,b,a]
 */
export default class AxesLayer extends Layer {
  initializeState() {
    const {gl} = this.context;
    const attributeManager = this.getAttributeManager();

    attributeManager.addInstanced({
      instancePositions: {size: 2, update: this.calculateInstancePositions, noAlloc: true},
      instanceNormals: {size: 3, update: this.calculateInstanceNormals, noAlloc: true},
    });

    this.setState(
      Object.assign(
        {
          numInstances: 0
        },
        this._getModels(gl)
      )
    );
  }

  updateState({oldProps, props}) {
    const attributeManager = this.getAttributeManager();

    if (
      oldProps.xScale !== props.xScale ||
      oldProps.yScale !== props.yScale ||
      oldProps.zScale !== props.zScale ||
      oldProps.xTicks !== props.xTicks ||
      oldProps.yTicks !== props.yTicks ||
      oldProps.zTicks !== props.zTicks ||
      oldProps.xTickFormat !== props.xTickFormat ||
      oldProps.yTickFormat !== props.yTickFormat ||
      oldProps.zTickFormat !== props.zTickFormat
    ) {
      const {xScale, yScale, zScale} = props;

      const ticks = [
        getTicks({...props, axis: 'x'}),
        getTicks({...props, axis: 'z'}),
        getTicks({...props, axis: 'y'})
      ];

      const xRange = xScale.range();
      const yRange = yScale.range();
      const zRange = zScale.range();

      this.setState({
        ticks,
        gridDims: [xRange[1] - xRange[0], zRange[1] - zRange[0], yRange[1] - yRange[0]],
        gridCenter: [
          (xRange[0] + xRange[1]) / 2,
          (zRange[0] + zRange[1]) / 2,
          (yRange[0] + yRange[1]) / 2
        ]
      });

      attributeManager.invalidateAll();
    }
  }

  draw({uniforms}) {
    const {gridDims, gridCenter, modelsByName, numInstances} = this.state;
    const {color, padding} = this.props;

    const baseUniforms = {
      gridDims,
      gridCenter,
      gridOffset: padding,
      strokeColor: color
    };

    modelsByName.grids.setInstanceCount(numInstances);
    modelsByName.grids.setUniforms(Object.assign({}, uniforms, baseUniforms)).draw();
  }

  _getModels(gl) {
    /* grids:
     * for each x tick, draw rectangle on yz plane around the bounding box.
     * for each y tick, draw rectangle on zx plane around the bounding box.
     * for each z tick, draw rectangle on xy plane around the bounding box.
     * show/hide is toggled by the vertex shader
     */
    /*
     * rectangles are defined in 2d and rotated in the vertex shader
     *
     * (-1,1)      (1,1)
     *   +-----------+
     *   |           |
     *   |           |
     *   |           |
     *   |           |
     *   +-----------+
     * (-1,-1)     (1,-1)
     */

    // offset of each corner
    const gridPositions = [
      // left edge
      -1,
      -1,
      0,
      -1,
      1,
      0,
      // top edge
      -1,
      1,
      0,
      1,
      1,
      0,
      // right edge
      1,
      1,
      0,
      1,
      -1,
      0,
      // bottom edge
      1,
      -1,
      0,
      -1,
      -1,
      0
    ];
    // normal of each edge
    const gridNormals = [
      // left edge
      -1,
      0,
      0,
      -1,
      0,
      0,
      // top edge
      0,
      1,
      0,
      0,
      1,
      0,
      // right edge
      1,
      0,
      0,
      1,
      0,
      0,
      // bottom edge
      0,
      -1,
      0,
      0,
      -1,
      0
    ];

    const grids = new Model(gl, {
      id: `${this.props.id}-grids`,
      vs: gridVertex,
      fs: fragmentShader,
      geometry: new Geometry({
        drawMode: GL.LINES,
        attributes: {
          positions: new Float32Array(gridPositions),
          normals: new Float32Array(gridNormals)
        },
        vertexCount: gridPositions.length / 3
      }),
      isInstanced: true
    });

    return {
      models: [grids].filter(Boolean),
      modelsByName: {grids}
    };
  }

  calculateInstancePositions(attribute) {
    const {ticks} = this.state;

    const positions = ticks.map(axisTicks => axisTicks.map((t, i) => [t.position, i]));

    const value = new Float32Array(flatten(positions));
    attribute.value = value;

    this.setState({numInstances: value.length / attribute.size});
  }

  calculateInstanceNormals(attribute) {
    const {
      ticks: [xTicks, zTicks, yTicks]
    } = this.state;

    const normals = [
      xTicks.map(() => [1, 0, 0]),
      zTicks.map(() => [0, 1, 0]),
      yTicks.map(() => [0, 0, 1])
    ];

    attribute.value = new Float32Array(flatten(normals));
  }
}

AxesLayer.layerName = 'AxesLayer';
AxesLayer.defaultProps = defaultProps;
