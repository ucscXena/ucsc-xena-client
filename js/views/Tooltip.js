import PureComponent from '../PureComponent';
var React = require('react');
var _ = require('../underscore_ext').default;
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
	sig: (i, lHover, lFrozen, val, frozen) => {
		return (
			<span key={i}>{frozen ? lFrozen : lHover}: {val}</span>
		);
	},
	url: (i, text, url) => (
		<span key={i}><a href={url} target='_blank'>{text}</a></span>
	),
	urls: (i, urls, frozen) => {
		let visibleCount = frozen ? urls.length : 3,
			visible = urls.slice(0, visibleCount),
			moreCount = urls.length - visibleCount;
		return (
			<span key={i}>
				{visible.map(([type, ...args], j) => (element[type](j, ...args)))}
				{moreCount > 0 ? <span className={compStyles.moreGene}>+ {moreCount} more</span> : null}
			</span>
		);
	}
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

class Tooltip extends PureComponent {
	state = {
		tooltip: {open: false},
	};
	UNSAFE_componentWillMount() {//eslint-disable-line camelcase
		this.sub = this.props.tooltip.subscribe(ev => this.setState({tooltip: ev}));
	}
	componentWillUnmount() {
		this.sub.unsubscribe();
	}
	render() {
		var {onClose} = this.props,
			{data, frozen} = this.state.tooltip,
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

		var rowsOut = _.map(rows, (row, i) => (
			<li key={i}>
				{row.map(([type, ...args], k) => type === 'urls' ?
					element[type](k, args, frozen) : type === 'sig' ? element[type](k, ...args, frozen) : element[type](k, ...args))}
			</li>
		));
		var closeIcon = frozen ? <i className='material-icons' onClick={onClose}>close</i> : null;
		var sample = sampleID ? <span>{sampleID}</span> : null;

		return (
			<div>
				{frozen ? overlay() : null}
				<div key={sampleID} className={classNames(compStyles.Tooltip, {[compStyles.frozen]: frozen})}>
					<ul className={compStyles.content}>
						{sampleID ? "sample: " : null}
						{sampleID ? <li className={compStyles.title}>
							{sample}
						</li> : null}
						<li
							className={compStyles.tooltipHint}>{`${meta.name}-click to ${frozen ? 'unfreeze' : 'freeze'} tooltip`}</li>
						{rowsOut}
					</ul>
					{closeIcon}
				</div>
			</div>
		);
	}
}

module.exports = Tooltip;
