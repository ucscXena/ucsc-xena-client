// light-weight svg density plot
import {el} from '../chart/react-hyper';
var {Let, merge, mmap, partitionN, range} = require('../underscore_ext').default;
var svg = el('svg');
var path = el('path');

// compute one component
var catmullRomSplineXY = (p0, p1, p2, p3, t) =>
    0.5 * (2 * p1 + (-p0 + p2) * t +
        (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t +
        (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);

var catmullRomSpline = (p0, p1, p2, p3, t) =>
    mmap(p0, p1, p2, p3, [t, t], catmullRomSplineXY);

var computeCatmullRomSpline = (points, numPoints = 100) =>
	range(1, points.length - 2).map(i =>
        range(0, 1, 1 / numPoints).map(t =>
            catmullRomSpline(points[i - 1],
                points[i], points[i + 1], points[i + 2], t)))
        .flat().concat([points[points.length - 1]]);

var spline = data =>
	Let((spline = computeCatmullRomSpline(data)) =>
        [`M 0, 0 L ${data[0].join(',')}`,
            ...partitionN(spline.slice(0, spline.length - spline.length % 3), 3, 3)
                .map(pts => `C ${pts.map(p => p.join(',')).join(' ')}`),
            `L ${spline[spline.length - 1][0]}, 0`].join(' '));

var svgProps = {
    preserveAspectRatio: 'none',
};
export default ({dist, ...props}) =>
    svg(merge(props, svgProps),
        path({d: spline(dist), fill: '#A0A0FF', stroke: 'none'}));
