'use strict';

var React = require('react');
import {Card} from 'react-toolbox/lib/card';
import PureComponent from '../PureComponent';
import ConceptSuggest from './ConceptSuggest';
import Dropdown from 'react-toolbox/lib/dropdown';
import {IconButton} from 'react-toolbox/lib/button';
var {times, pick} = require('../underscore_ext');

var XDialog = require('./XDialog');


var {mapObject} = require('../underscore_ext');

var compStyles = require('./TiesView.module.css');
var typStyles = require('../../css/typography.module.css');
var classNames = require('classnames');
var setKey = arr => arr.map((el, i) => React.cloneElement(el, {key: i}));

const pageSizes = [
	{value: 10, label: '10'},
	{value: 20, label: '20'},
	{value: 50, label: '50'},
	{value: 100, label: '100'}];

var filterIcon = (hasDoc, filter) =>
	!hasDoc ? <i>remove</i> :
		filter == null ? '\u00A0' :
			filter ? <i className={compStyles.filterStatusKeep}>check</i> :
				<i>close</i>;

var Pagenation = ({onPage, onPageSize, onForward, onBack, page, pageCount}) => (
	<div className={compStyles.pagination}>
		<span>Goto page:
			<Dropdown className={compStyles.pageDropdown}
					  auto
					  onChange={onPage}
					  source={times(pageCount, i => ({value: i, label: i + 1}))}
					  value={page.i}
			/>
		</span>
		<span>Items per page:
			<Dropdown className={compStyles.pageDropdown}
					  auto
					  onChange={onPageSize}
					  source={pageSizes}
					  value={page.n}
			/>
		</span>
		<IconButton className={compStyles.paginationIcon} icon='chevron_left' disabled={page.i === 0}
					onClick={onBack}/>
		<IconButton className={compStyles.paginationIcon} icon='chevron_right'
					disabled={page.i > pageCount - 2} onClick={onForward}/>
		<span>{page.i * page.n} - {(page.i + 1) * page.n - 1} of {page.n * pageCount - 1}</span>
	</div>);

class Ties extends PureComponent {

	onForward = () => {
		var {onPage, state: {ties: {page: {i, n}}}} = this.props;
		onPage({i: i + 1, n});
	};

	onBack = () => {
		var {onPage, state: {ties: {page: {i, n}}}} = this.props;
		onPage({i: i - 1, n});
	};

	onPage = i => {
		var {onPage, state: {ties: {page: {n}}}} = this.props;
		onPage({i, n});
	};

	onPageSize = n => {
		var {onPage, state: {ties: {page}}} = this.props,
			i = Math.floor((page.n * page.i) / n);
		onPage({i, n});
	};

	onHideDoc = () => {
		this.props.onHideDoc();
	};

	onShowDoc = ev => {
		var index = parseInt(ev.currentTarget.dataset.index, 10);
		this.props.onShowDoc(index);
	};

	onKeepRow = ev => {
		var keep = ev.target.dataset.keep === 'true',
			{onKeepRow, state: {ties: {showDoc}}} = this.props;

		onKeepRow(showDoc, keep);
	};

	render() {
		var {onAddTerm, state} = this.props,
			{
				terms = [], docs, matches = {}, showWelcome = true,
				filter, showDoc, doc, page, concepts = []
			} = state.ties,
			dialogProps = {
				dialogActive: !!showDoc,
				onKeepRow: this.onKeepRow,
				patient: showDoc && docs[showDoc].patient,
				closeReport: this.onHideDoc
			},
			pageCount = Math.ceil((docs || []).length / page.n),
			pagenationHandlers = pick(this, ['onPage', 'onPageSize', 'onForward', 'onBack']),
			byTerm = mapObject(matches, ({matches}) => new Set(matches)); // XXX put in selector
		return (
			<Card className={compStyles.tiesView}>
				<div className={compStyles.tiesViewHeader}>
					<div className={compStyles.tiesFilter}>
						<ConceptSuggest onAddTerm={onAddTerm} concepts={concepts}/>
						<span className={compStyles.tiesFilterTerms}>
							Search Terms: {terms.map(t => matches[t] ? t : `${t} (loading)`).join(', ')}
							</span>
					</div>
					<Pagenation {...pagenationHandlers} page={page} pageCount={pageCount}/>
				</div>
				<div>
					<div className={compStyles.tiesTableRowHeader}>
						<div>Filter</div>
						<div>Sample ID</div>
						<div>Pathology Report</div>
						{terms.map((t, i) => byTerm[t] ? <div key={i}>{t}</div> : <div key={i}></div>)}
					</div>
					{docs ? setKey(docs.slice(page.i * page.n, (page.i + 1) * page.n).map(
						({patient, doc}, i) =>
							<div className={classNames(
								compStyles.tiesTableRow,
								{[compStyles.tiesTableRowActive]: (page.i * page.n + i === showDoc)})}
								data-index={page.i * page.n + i}
								onClick={doc ? this.onShowDoc : undefined}>
								<div>{filterIcon(doc, filter[page.i * page.n + i])}</div>
								<div>{patient}</div>
								<div>{doc ? <i className={compStyles.reportIcon}>description</i> : null}</div>
								{terms.map((t, i) => byTerm[t] && byTerm[t].has(patient) ? <div key={i}>{t}</div> :
									<div key={i}></div>)}
							</div>
					)) : '...loading'}
				</div>
				<Pagenation {...pagenationHandlers} page={page} pageCount={pageCount}/>
				<XDialog {...dialogProps}
						 terms={terms}
						 reportText={doc && doc.text.slice(0, 100)}
						 fullReportText={doc && doc.text}/>
				{showWelcome ? <div className={compStyles.tiesWelcome}>
				<i className='material-icons' onClick={this.props.onDismissWelcome}>close</i>
				<div className={compStyles.welcomeTiesText}>
				<h1 className={typStyles.mdHeadline}>Welcome to the Pathology Report Filtering Tool by Ties</h1>
				<h2 className={typStyles.mdSubhead}>This tool allows users to view and search the pathology
				reports,
				using them to <br/>select samples of interest and then create a filtered column based on the
				samples<br/>
				of interest.</h2>
				<h2 className={typStyles.mdSubhead} onClick={this.props.onDismissWelcome}>Begin by searching using
				key words of interest</h2>
				</div>
				</div> : null}
			</Card>
		);
	}
}

export default Ties;
