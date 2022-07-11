import PureComponent from '../PureComponent';
import {Backdrop, Box, Icon, IconButton, Link, Paper, Typography} from '@material-ui/core';
var React = require('react');
var _ = require('../underscore_ext').default;
var meta = require('../meta');
var classNames = require('classnames');
import {xenaColor} from '../xenaColor';

// Styles
var compStyles = require('./Tooltip.module.css');
var sxTooltip = {
	borderBottom: `1px solid ${xenaColor.BLACK_6}`,
};

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
		<span key={i}><Link href={url} target='_blank'>{text}</Link></span>
	),
	urls: (i, urls, frozen) => {
		let visibleCount = frozen ? urls.length : 3,
			visible = urls.slice(0, visibleCount),
			moreCount = urls.length - visibleCount;
		return (
			<span key={i}>
				{visible.map(([type, ...args], j) => (element[type](j, ...args)))}
				{moreCount > 0 ? <Box component='span' className={compStyles.moreGene} color={xenaColor.BLACK_38}>+ {moreCount} more</Box> : null}
			</span>
		);
	}
//	popOver: (i, text, dataList) => (
//		<span key={i}><a><PopOverVariants label={text} body={dataList}/></a></span>
//	),
};

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
			return (<Box component={Paper} className={compStyles.Tooltip} elevation={0} square sx={sxTooltip}>
				<Typography component='ul' className={compStyles.content}>
					<li><Link
						href='https://ucsc-xena.gitbook.io/project/'
						target='_blank' rel='noopener noreferrer' variant='caption'>User Guide</Link></li>
					<li><Link
						href='https://ucsc-xena.gitbook.io/project/overview-of-features/visual-spreadsheet#zooming'
						target='_blank' rel='noopener noreferrer' variant='caption'>Zoom Help</Link></li>
					<li><Link
						href='https://ucsc-xena.gitbook.io/project/how-do-i/freeze-and-un-freeze-tooltip'
						target='_blank' rel='noopener noreferrer' variant='caption'>Tooltip Help</Link></li>
				</Typography>
			</Box>);
		}

		var rowsOut = _.map(rows, (row, i) => (
			<Box key={i} component='li' color={xenaColor.BLACK_54}>
				{row.map(([type, ...args], k) => type === 'urls' ?
					element[type](k, args, frozen) : type === 'sig' ? element[type](k, ...args, frozen) : element[type](k, ...args))}
			</Box>
		));
		var closeIcon = frozen ? <Box component={IconButton} edge='end' onClick={onClose} size='small' sx={{color: xenaColor.BLACK_54}}><Icon>close</Icon></Box> : null;
		var sample = sampleID ? <span>{sampleID}</span> : null;

		return (
			<div>
				<Box component={Backdrop} open={frozen} sx={{bgcolor: xenaColor.BLACK_12, zIndex: 1200}}/>
				<Box component={Paper} key={sampleID}
					 className={classNames(compStyles.Tooltip, {[compStyles.frozen]: frozen})}
					 elevation={0} square sx={sxTooltip}>
					<Typography component='ul' className={compStyles.content} variant='body1'>
						{sampleID ? "sample: " : null}
						{sampleID ? <Typography component='li' className={compStyles.title} variant='body1'>
							{sample}
						</Typography> : null}
						<Typography component='li' variant='caption'>
							<Box color={xenaColor.BLACK_38}>{`${meta.name}-click to ${frozen ? 'unfreeze' : 'freeze'} tooltip`}</Box>
						</Typography>
						{rowsOut}
					</Typography>
					{closeIcon}
				</Box>
			</div>
		);
	}
}

module.exports = Tooltip;
