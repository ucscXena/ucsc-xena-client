/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Standard Xena dialog.
 *
 * State
 * -----
 *
 * Actions
 * -------
 */

'use strict';

// Core dependencies, components
var React = require('react');
import {Dialog} from 'react-toolbox/lib/dialog';
import {Button} from 'react-toolbox/lib/button';
import {sortBy, mmap, flatten, flatmap} from '../underscore_ext';

// Styles
var compStyles = require('./XDialog.module.css');
import typStyles from '../../css/typography.module.css';

var setKey = arr => arr.map((el, i) => React.cloneElement(el, {key: i}));

var HIGHLIGHTS = 10; // must match highlight classes in XDialig.module.css

var interleave = (a, b) =>
	flatten(mmap(a, b, (a, b) => [a, b]));

var newlines = s => {
	var segment = s.split(/\n/);
	return [...flatmap(segment.slice(0, segment.length - 1),
			s => [<span>{s}</span>, <br/>]), <span>{segment[segment.length - 1]}</span>];
};

// If any of the highlights overlap, we're in a bad way.
function splitText(highlights, text) {
	var sortedHighlights = sortBy(highlights, 'start'),
		textHighlights = sortedHighlights.map(
				hl => (
					<span className={compStyles[`highlight${hl.index % HIGHLIGHTS}`]}>
						{text.slice(hl.start, hl.end)}
					</span>)),
		textPlain = sortedHighlights.map(
			(hl, i) => (<span>{setKey(newlines(text.slice(hl.end,
							i === highlights.length - 1 ? text.length :
							sortedHighlights[i + 1].start)))}</span>));

	return setKey(
			[<span>{setKey(newlines(text.slice(0, sortedHighlights[0].start)))}</span>, ...interleave(textHighlights, textPlain)]);
}


class XDialog extends React.Component {

	closeReport = () => {
		this.props.closeReport();
	};

	onKeepRow = (ev) => {
		this.props.onKeepRow(ev);
	};

	render() {
		var {dialogActive, patient, terms, highlights, fullReportText} = this.props;
		return (
			<div>
				<Dialog active={dialogActive} onEscKeyDown={this.closeReport}>
					<div className={compStyles.reportHeader}>
						<div className={compStyles.reportTitle}>
							<span className={typStyles.mdHeadline}>Pathology Report</span>
							<i className='material-icons' onClick={this.closeReport}>close</i>
						</div>
						<div className={typStyles.mdBody1}>{patient}</div>
					</div>
					<div className={compStyles.reportFilter}>
						<div>Report Results:</div>
						<div>
							{terms.map((t, i) => <span key={i}><span>"</span><span
								className={compStyles[`highlight${i % HIGHLIGHTS}`]}>{t}</span><span>"</span></span>)}
						</div>
						<div className={compStyles.reportAction}>
							<Button data-keep={false} onClick={this.onKeepRow}>DISCARD</Button>
							<Button accent data-keep={true} onClick={this.onKeepRow}>KEEP</Button>
						</div>
					</div>
					<div className={compStyles.reportContent}>
						<p>{highlights && splitText(highlights, fullReportText)}</p>
					</div>
				</Dialog>
			</div>
		)
			;
	}
}

module.exports = XDialog;
