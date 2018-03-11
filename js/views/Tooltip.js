'use strict';

var React = require('react');
var createReactClass = require('create-react-class');
var _ = require('../underscore_ext');
var {deepPureRenderMixin} = require('../react-utils');
var meta = require('../meta');
var classNames = require('classnames');

// Styles
var compStyles = require('./Tooltip.module.css');

var element = {
	value: (i, v) => <span key={i}>{v}</span>,
	label: (i, l) => <span key={i}>{l}</span>,
	labelValue: (i, l, v) => (
		<span key={i}>{l}: {v}</span>
	),
	url: (i, text, url) =>  (
		<span key={i}><a href={url} target='_blank'>{text}</a></span>
	),
//	popOver: (i, text, dataList) => (
//		<span key={i}><a><PopOverVariants label={text} body={dataList}/></a></span>
//	),
};

function overlay() {
	return <div className={compStyles.overlay}/>;
}

//var PopOverVariants = React.createClass({
//  getInitialState() {
//    return { showModal: false };
//  },
//
//  close() {
//    this.setState({ showModal: false });
//  },
//
//  open() {
//    this.setState({ showModal: true });
//  },
//
//  render() {
//	var label = this.props.label,
//		dataList = this.props.body;
//
//	var rowsOut = _.map(dataList, (row, i) => (
//		<tr key={i}>
//			{row.map(([type, ...args], i) => element[type](i, ...args))}
//		</tr>
//	));
//
//
//    return (
//      <div>
//        <span
//          onClick={this.open}
//        >
//        {label}
//        </span>
//
//        <Modal show={this.state.showModal} onHide={this.close}>
//          <Modal.Header closeButton>
//            <Modal.Title>Variants</Modal.Title>
//          </Modal.Header>
//          <Modal.Body>
//			<div>
//				<table> {rowsOut} </table>
//			</div>
//          </Modal.Body>
//          <Modal.Footer>
//            <Button onClick={this.close}>Close</Button>
//          </Modal.Footer>
//        </Modal>
//      </div>
//    );
//  }
//});

var Tooltip = createReactClass({
	mixins: [deepPureRenderMixin], // XXX any reason to use deep vs. shallow?
	render: function () {
		var {data, open, onClick, onClose, frozen} = this.props,
			rows = _.getIn(data, ['rows']),
			sampleID = _.getIn(data, ['sampleID']);

		// no tooltip info
		if (!rows && !sampleID) {
			return (<div/>);
		}

		var rowsOut = _.map(rows, (row, i) => (
			<li key={i}>
				{row.map(([type, ...args], i) => element[type](i, ...args))}
			</li>
		));
		var closeIcon = frozen ? <i className='material-icons' onClick={onClose}>close</i> : null;
		var sample = sampleID ? <span>{sampleID}</span> : null;

		return (
			<div onClick={onClick}>
				{frozen ? overlay(onClick) : null}
				<div className={classNames(compStyles.Tooltip, {[compStyles.open]: open})}>
					<ul className={compStyles.content}>
						<li className={compStyles.title}>{sample}{closeIcon}</li>
						{rowsOut}
					</ul>
					<div className={compStyles.actions}>
						<span className={compStyles.zoomHint}>{`${meta.name}-click to ${frozen ? "unfreeze" : "freeze"} tooltip`}</span>
						<a href="http://xena.ucsc.edu/spreadsheet-zoom/" target="_blank"><i className='material-icons'>help</i></a>
					</div>
				</div>
			</div>
		);
	}
});

module.exports = Tooltip;
