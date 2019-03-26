'use strict';

import PureComponent from '../PureComponent';

var React = require('react');
var _ = require('../underscore_ext');
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
	meanMedian: (i, v1, v2) => (
		<span key={i}>{v1} {v2}</span>
	),
	url: (i, text, url) => (
		<span key={i}><a href={url} target='_blank'>{text}</a></span>
	),
//	popOver: (i, text, dataList) => (
//		<span key={i}><a><PopOverVariants label={text} body={dataList}/></a></span>
//	),
};

function overlay() {
	return <div className={compStyles.overlay}/>;
}

function rowsOut(rows, frozen) {

	let showGeneList = true;
	let geneList = rows.filter(row => row[0][1].includes('Gene'));
	geneList = geneList.length > 0 ? geneList.map(geneUrl => geneUrl[1]) : '';
	let showXGenes = frozen ? geneList.length : 3;

	rows = rows.map(row => {

		if (row[0][1].includes('Mean') && !frozen) {

			let meanRegex = /[^0-9-.]/g;
			let meanMedian = row[0][2].split(' ');
			let meanValue = meanMedian[0].includes('undefined') ? '--' : Number(meanMedian[0]).toFixed(3);
			let medianValue = meanMedian[1].includes('undefined') ? '--' : Number(meanMedian[1].replace(meanRegex, '')).toFixed(3);
			row[0][0] = 'meanMedian';
			row[0][1] = `Mean: ${meanValue}`;
			row[0][2] = `Median: ${medianValue}`;
		}
		return row;
	});

	return _.map(rows, (row, i) => {

		if (row[0][1].includes('Gene') && showGeneList === true) {
			showGeneList = false;
			return (
				<li key={i}>
					<span>Gene</span>
					{geneList.slice(0, showXGenes).map(([type, ...args], j) => element[type](j, ...args))}
					{geneList.length > showXGenes ?
						<span className={compStyles.moreGene}>+ {geneList.length - showXGenes} more</span> : null}
				</li>
			);
		}

		else if (!row[0][1].includes('Gene')) {
			return (
				<li key={i}>
					{row.map(([type, ...args], k) => element[type](k, ...args))}
				</li>);
		}
	});
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

class Tooltip extends PureComponent {
	render() {
		var {data, onClick, onClose, frozen} = this.props,
			rows = _.getIn(data, ['rows']),
			sampleID = _.getIn(data, ['sampleID']);

		// no tooltip, helper links
		if (!rows && !sampleID) {
			return (<div className={compStyles.Tooltip}>
				<ul className={compStyles.content}>
					<li className={compStyles.tooltipHint}><a
						href='https://ucsc-xena.gitbook.io/project/'
						target='_blank' rel='noopener noreferrer'>User Guide</a></li>
					<li className={compStyles.tooltipHint}><a
						href='https://ucsc-xena.gitbook.io/project/overview-of-features/visual-spreadsheet#zooming'
						target='_blank' rel='noopener noreferrer'>Zoom Help</a></li>
					<li className={compStyles.tooltipHint}><a
						href='https://ucsc-xena.gitbook.io/project/how-do-i/freeze-and-un-freeze-tooltip'
						target='_blank' rel='noopener noreferrer'>Tooltip Help</a></li>
				</ul>
			</div>);
		}

		var closeIcon = frozen ? <i className='material-icons' onClick={onClose}>close</i> : null;
		var sample = sampleID ? <span>{sampleID}</span> : null;

		return (
			<div onClick={onClick}>
				{frozen ? overlay(onClick) : null}
				<div key={sampleID} className={classNames(compStyles.Tooltip, {[compStyles.frozen]: frozen})}>
					<ul className={compStyles.content}>
						{sampleID ? <li className={compStyles.title}>
							{sample}
						</li> : null}
						<li
							className={compStyles.tooltipHint}>{`${meta.name}-click to ${frozen ? 'unfreeze' : 'freeze'} tooltip`}</li>
						{rowsOut(rows, frozen)}
					</ul>
					{closeIcon}
				</div>
			</div>
		);
	}
}

module.exports = Tooltip;
