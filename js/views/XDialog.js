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

// Styles
var compStyles = require('./XDialog.module.css');
import typStyles from '../../css/typography.module.css';

class XDialog extends React.Component {

	closeReport = () => {
		this.props.closeReport();
	};

	onKeepRow = (ev) => {
		this.props.onKeepRow(ev);
	};

	render() {
		var {dialogActive, patient, terms, children} = this.props;

		return (
			<div>
				<Dialog active={dialogActive} onEscKeyDown={this.closeReport}
						theme={{
							body: compStyles.dialogBody,
							dialog: compStyles.dialog
						}}>
					<div className={compStyles.reportHeader}>
						<div className={compStyles.reportTitle}>
							<span className={typStyles.mdHeadline}>Pathology Report</span>
							<i className='material-icons' onClick={this.closeReport}>close</i>
						</div>
						<div className={typStyles.mdBody1}>{patient}</div>
					</div>
					<div className={compStyles.reportTerms}>
						<div>Search Terms:</div>
						<div>
							{terms.length ? terms.map(({term, color}, i) => (
								<span key={i}>
									"<span style={{backgroundColor: color}}>{term}</span>"
									{i === terms.length - 1 ? '' : ', '}
								</span>)) : <span>No terms</span>}
						</div>
						<div className={compStyles.reportAction}>
							<Button data-keep={false} onClick={this.onKeepRow}>DISCARD</Button>
							<Button accent data-keep={true} onClick={this.onKeepRow}>KEEP</Button>
						</div>
					</div>
					<div className={compStyles.reportContent}>
						{children}
					</div>
				</Dialog>
			</div>
		)
			;
	}
}

module.exports = XDialog;
