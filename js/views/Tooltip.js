
'use strict';

var React = require('react');
var _ = require('../underscore_ext');
var {deepPureRenderMixin} = require('../react-utils');
var meta = require('../meta');
var Modal = require('react-bootstrap/lib/Modal');
var {Button} = require('react-bootstrap/lib/');
require('./Tooltip.css');

var sampleLayout = id => (
		<tr>
			<td className='sampleID'>{id}</td>
		</tr>);

var element = {
	value: (i, v) => <td key={i}><span className='tupleValue'>{v}</span></td>,
	label: (i, l) => <td key={i}><span className='tupleLabel'>{l}</span></td>,
	labelValue: (i, l, v) => (
		<td key={i}>{l}: <span className='tupleValue'>{v}</span></td>
	),
	url: (i, text, url) =>  (
		<td key={i} className='urlValue'><a href={url} target='_BLANK'>{text}</a></td>
	),
	popOver: (i, text, dataList) => (
		<td key={i}><a><PopOverVariants label={text} body={dataList}/></a></td>
	),
};

var styles = {
	overlay: () => ({
		zIndex: 998,
		position: 'fixed',
		top: 0,
		left: 0,
		width: document.body.clientWidth,
		height: document.body.clientHeight,
		backgroundColor: 'transparent'
	})
};

function overlay() {
	return <div style={styles.overlay()}/>;
}

var PopOverVariants = React.createClass({
  getInitialState() {
    return { showModal: false };
  },

  close() {
    this.setState({ showModal: false });
  },

  open() {
    this.setState({ showModal: true });
  },

  render() {
	var label = this.props.label,
		dataList = this.props.body;

	var rowsOut = _.map(dataList, (row, i) => (
		<tr key={i}>
			{row.map(([type, ...args], i) => element[type](i, ...args))}
		</tr>
	));


    return (
      <div>
        <span
          onClick={this.open}
        >
        {label}
        </span>

        <Modal show={this.state.showModal} onHide={this.close}>
          <Modal.Header closeButton>
            <Modal.Title>Variants</Modal.Title>
          </Modal.Header>
          <Modal.Body>
			<div>
				<table> {rowsOut} </table>
			</div>
          </Modal.Body>
          <Modal.Footer>
            <Button onClick={this.close}>Close</Button>
          </Modal.Footer>
        </Modal>
      </div>
    );
  }
});

var Tooltip = React.createClass({
	mixins: [deepPureRenderMixin], // XXX any reason to use deep vs. shallow?
	render: function () {
		var {data, open, onClick, frozen} = this.props,
			rows = _.getIn(data, ['rows']),
			sampleID = _.getIn(data, ['sampleID']);

		// no tooltip info
		if (!rows && !sampleID) {
			return (<div/>);
		}

		var rowsOut = _.map(rows, (row, i) => (
			<tr key={i}>
				{row.map(([type, ...args], i) => element[type](i, ...args))}
			</tr>
		));
		var sample = sampleID ? sampleLayout(sampleID) : null;
		var display = open ? 'block' : 'none';
		// className 'tooltip' aliases with bootstrap css.
		/*global document: false */
		return (
			<div onClick={onClick} style={{position: 'relative'}}>
				{frozen ?  overlay(onClick) : null}
				<div className='Tooltip' style={{zIndex: 999, display: display}}>
					<table>
						<tbody>
							{sample}
							{rowsOut}
							<tr style={{fontSize: "80%"}}>
								<td className='tooltipPrompt'>{`${meta.name}-click to ${frozen ? "unfreeze" : "freeze"}`}</td>
							</tr>
							<a className='tooltipPrompt' style={{fontSize: "80%"}} href="http://xena.ucsc.edu/spreadsheet-zoom/" target="_blank">Help with zoom</a>
						</tbody>
					</table>
				</div>
			</div>
		);
	}
});

module.exports = Tooltip;
