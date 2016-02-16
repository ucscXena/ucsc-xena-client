/*eslint-env browser */
/*global require: false, module: false */

'use strict';

require('../css/km.css');
var _ = require('./underscore_ext');
//var warningImg = require('../images/warning.png');
var React = require('react');
var { PropTypes } = React;
var Modal = require('react-bootstrap/lib/Modal');
var { ListGroup, ListGroupItem, Row, Col, OverlayTrigger, Tooltip } = require('react-bootstrap/lib/');
//var Col = require('react-bootstrap/lib/Col');
var Axis = require('./Axis');
var {deepPureRenderMixin} = require('./react-utils');
var {linear, linearTicks} = require('./scale');
// XXX Warn on duplicate patients, and list patient ids?

// Basic sizes. Should make these responsive. How to make the svg responsive?
var size = {width: 960, height: 450};
var margin = {top: 20, right: 200, bottom: 30, left: 50};
// XXX point at 100%? [xdomain[0] - 1, 1]
function line(xScale, yScale, values) {
  var coords = values.map(({t, s}) => [xScale(t), yScale(s)]);
  return ['M0,0', ...coords.map(([t, s]) => `H${t}V${s}`)].join(' ');
}

function isActiveLabel(activeLabel, currentLabel) {
  if (activeLabel)
    return (activeLabel === currentLabel);
  else
    return false;
}

function censorLines(xScale, yScale, censors, className) {
  /*eslint-disable comma-spacing */
  return censors.map(({t, s}, i) =>
    <line
      key={i}
      className={className}
      x1={0} x2={0} y1={-5} y2={5}
      transform={`translate(${xScale(t)},${yScale(s)})`}/>
  );
  /*eslint-enable comma-spacing */
}

var drawGroup = function(xScale, yScale, [color, label, curve], setActiveLabel, activeLabel ) {
  var censors = curve.filter(pt => !pt.e);
  let activeLabelClassName = isActiveLabel(activeLabel, label) ? ' lineGlow' : '';

  return (
    <g key={label} className='subgroup' stroke={color} onMouseOver={(e) => setActiveLabel(e, label)} >
      <path className={'outline' +activeLabelClassName} d={line(xScale, yScale, curve)}/>
      <path className='line' d={line(xScale, yScale, curve)}/>
      {censorLines(xScale, yScale, censors, 'outline'+activeLabelClassName)}
      {censorLines(xScale, yScale, censors, 'line'+activeLabelClassName)}
    </g>);
}

var bounds = x => [_.min(x), _.max(x)];

function svg({colors, labels, curves}, setActiveLabel, activeLabel) {
  var height = size.height - margin.top - margin.bottom,
    width = size.width - margin.left - margin.right,
    xdomain = bounds(_.pluck(_.flatten(curves), 't')),
    xrange = [0, width],
    ydomain = [0, 1],
    yrange = [height, 0],
    xScale = linear(xdomain, xrange),
    yScale = linear(ydomain, yrange);

  var groupSvg = _.zip(colors, labels, curves).map(g => drawGroup(xScale, yScale, g, setActiveLabel, activeLabel));

  /*eslint-disable comma-spacing */
  return (
    <svg className='kmplot' width={size.width} height={size.height}>
      <g transform={`translate(${margin.left}, ${margin.top})`}>
        <Axis
          groupProps={{
            className: 'x axis',
            transform: `translate(0, ${height})`
          }}
          domain={xdomain}
          range={xrange}
          scale={xScale}
          tickfn={linearTicks}
          orientation='bottom'
        />
        <Axis
          groupProps={{
            className: 'y axis'
          }}
          domain={ydomain}
          range={yrange}
          scale={yScale}
          tickfn={linearTicks}
          orientation='left'>

          <text
            transform='rotate(-90)'
            y='6'
            x={-height}
            dy='.71em'
            textAnchor='start'>
            Survival percentage
          </text>
        </Axis>
        {groupSvg}
      </g>
    </svg>
  );
  /*eslint-enable comma-spacing */
}

function makeLegendKey([color, curves, label], setActiveLabel, activeLabel ) {
  // show colored line and category of curve
  let activeLabelClassName = isActiveLabel(activeLabel, label) ? 'legendGlow' : '';

  return (
    <li
      key={label}
      className={"list-group-item kmDialog" +" " +activeLabelClassName}
      onMouseOver={(e) => setActiveLabel(e, label)}
      onMouseOut={(e) => setActiveLabel(e, '')}>
      <span style={{color: color}} className="legendKey">-- </span>
      <span>{label}</span>
    </li>
  );
}


var PValue = React.createClass({
  render: function() {
    const tooltip = (
      <Tooltip placement='top'>
        Some individuals survival data are used more than once in the KM plot. Affected patients are: TCGA-G4-6317-02, TCGA-A6-2671-01, TCGA-A6-2680-01, TCGA-A6-2684-01, TCGA-A6-2685-01, TCGA-A6-2683-01, TCGA-AA-3520-01, TCGA-AA-3525-01.   For more information and how to remove such duplications: https://goo.gl/TSQt6z.
      </Tooltip>
    );

    return (
      <ListGroup>
        <ListGroupItem>
          <OverlayTrigger placement='left' overlay={tooltip} trigger={['hover', 'click']}>
            <span className="glyphicon glyphicon-question-sign"></span>
          </OverlayTrigger>
          <span>P-Value =</span>
        </ListGroupItem>
        <ListGroupItem>
          <span>Log-rank Test Stats =</span>
          <span>0.0000</span>
        </ListGroupItem>
      </ListGroup>
    )
  }
})

var Legend = React.createClass({
  propTypes: {
    activeLabel: PropTypes.string,
    columns: PropTypes.number,
    groups: PropTypes.object,
    setActiveLabel: PropTypes.func
  },

  render: function() {
    let { groups, setActiveLabel, activeLabel } = this.props;
    let { colors, curves, labels } = groups;
    let sets = _.zip(colors, curves, labels).map((set, index) => makeLegendKey(set, setActiveLabel, activeLabel));

    return ( <ListGroup>{sets}</ListGroup> );
  }
});

var KmPlot = React.createClass({
  mixins: [deepPureRenderMixin],
  getDefaultProps: () => ({
    eventClose: 'km-close'
  }),

  getInitialState: () => ({
    activeLabel: ''
  }),

  hide: function () {
    let {callback, eventClose} = this.props;
    callback([eventClose]);
  },

  setActiveLabel: function(e, label) {
    this.setState({ activeLabel: label });
  },

  render: function () {
    let {km: {label, groups}} = this.props;

    // XXX Use bootstrap to lay this out, instead of tables + divs
    return (
      <Modal show={true} bsSize='large' className='kmDialog' onHide={this.hide}>
        <Modal.Header closeButton>
          <Modal.Title>{`Kaplan-Meier: ${label}`}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className='kmdiv'>
            <Row className="kmDialog">
              <Col md={9}>
                {groups ? svg(groups, this.setActiveLabel, this.state.activeLabel) : "Loading..."}
                <div className='kmScreen' />
              </Col>
              <Col md={3} className="metaData">
                <PValue />
                <Legend groups={groups} setActiveLabel={this.setActiveLabel} activeLabel={this.state.activeLabel} />
              </Col>

            </Row>
            <div className='kmopts'>
              <div>
                <table className='kmOpts'>
                  <tbody>
                    <tr>
                      <td className='tupleLabel'> Event Column: </td>
                      <td className='tupleValue'>
                        <select className='eventfeature'/>
                      </td>
                    </tr>
                    <tr>
                      <td className='tupleLabel'> Time Column: </td>
                      <td className='tupleValue'>
                        <select className='timefeature'/>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <span className='featureLabel'/>
        </Modal.Footer>
      </Modal>
    );
  }
});

module.exports = KmPlot;