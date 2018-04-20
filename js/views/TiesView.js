'use strict';

var React = require('react');
import {Card} from 'react-toolbox/lib/card';
import PureComponent from '../PureComponent';
import ConceptSuggest from './ConceptSuggest';
import Dropdown from 'react-toolbox/lib/dropdown';
import {IconButton} from 'react-toolbox/lib/button';

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

class Ties extends PureComponent {

	constructor(props) {
		super(props);
		this.state = {
			dialogActive: false,
			pageSelected: 1,
			pageSizeSelected: 10,
			patient: null
		};
	}

	onForward = () => {
		var {onPage, state: {ties: {page: {i, n}}}} = this.props;
		onPage({i: i + 1, n});
	};

	onBack = () => {
		var {onPage, state: {ties: {page: {i, n}}}} = this.props;
		onPage({i: i - 1, n});
	};

	onPage = ev => {
		var i = ev - 1,
			// var i = parseInt(ev.target.value, 10) - 1,
			{onPage, state: {ties: {page: {n}}}} = this.props;
		onPage({i, n});
	};

	onPageSize = ev => {
		var {onPage, state: {ties: {page}}} = this.props,
			n = ev,
			// n = parseInt(ev.target.value, 10),
			i = Math.floor((page.n * page.i) / n);
		onPage({i, n});
	};

	onHideDoc = () => {
		this.props.onHideDoc();
		this.setState({dialogActive: !this.state.dialogActive});
	};

	onShowDoc = (index, patient) => {
		this.props.onShowDoc(index);
		this.setState({dialogActive: !this.state.dialogActive, patient: patient});
	};

	onKeepRow = ev => {
		var keep = ev.target.dataset.keep === 'true',
			{onKeepRow, state: {ties: {showDoc}}} = this.props;

		onKeepRow(showDoc, keep);
	};

	handlePageSizeChange = (value) => {
		this.setState({pageSizeSelected: value});
		this.onPageSize(value);
	};

	handlePageChange = (value) => {
		this.setState({pageSelected: value});
		this.onPage(value);
	};

	getPages = (pageCount) => {
		var pages = [];
		for (var i = 0; i < pageCount; i++) {
			pages[i] = {
				value: i + 1,
				label: i + 1
			};
		}
		;
		return pages;
	};

	render() {
		var {onAddTerm, state} = this.props,
			{
				terms = [], docs, matches = {}, showWelcome = true,
				filter, showDoc, doc, page, concepts = []
			} = state.ties,
			dialogProps = {
				dialogActive: this.state.dialogActive,
				onKeepRow: this.onKeepRow,
				patient: this.state.patient,
				closeReport: this.onHideDoc
			},
			pageCount = Math.ceil((docs || []).length / page.n),
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
					<div className={compStyles.pagination}>
						<span>Goto page:
							<Dropdown className={compStyles.pageDropdown}
									  auto
									  onChange={this.handlePageChange}
									  source={this.getPages(pageCount)}
									  value={this.state.pageSelected}
							/>
						</span>
						<span>Items per page:
							<Dropdown className={compStyles.pageDropdown}
									  auto
									  onChange={this.handlePageSizeChange}
									  source={pageSizes}
									  value={this.state.pageSizeSelected}
							/>
						</span>
						<IconButton className={compStyles.paginationIcon} icon='chevron_left' disabled={page.i === 0}
									onClick={this.onBack}/>
						<IconButton className={compStyles.paginationIcon} icon='chevron_right'
									disabled={page.i > pageCount - 2} onClick={this.onForward}/>
						<span>{page.i * page.n} - {(page.i + 1) * page.n - 1} of {page.n * pageCount - 1}</span>
					</div>
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
								 onClick={doc ? () => this.onShowDoc(page.i * page.n + i, patient) : undefined}>
								<div>{filterIcon(doc, filter[page.i * page.n + i])}</div>
								<div>{patient}</div>
								<div>{doc ? <i className={compStyles.reportIcon}>description</i> : null}</div>
								{terms.map((t, i) => byTerm[t] && byTerm[t].has(patient) ? <div key={i}>{t}</div> :
									<div key={i}></div>)}
							</div>
					)) : '...loading'}
				</div>
				<div className={compStyles.pagination}>
					<span>Goto page:
						<Dropdown className={compStyles.pageDropdown}
								  auto
								  onChange={this.handlePageChange}
								  source={this.getPages(pageCount)}
								  value={this.state.pageSelected}
						/>
					</span>
					<span>Items per page:
						<Dropdown className={compStyles.pageDropdown}
								  auto
								  onChange={this.handlePageSizeChange}
								  source={pageSizes}
								  value={this.state.pageSizeSelected}
						/>
					</span>
					<IconButton className={compStyles.paginationIcon} icon='chevron_left' disabled={page.i === 0}
								onClick={this.onBack}/>
					<IconButton className={compStyles.paginationIcon} icon='chevron_right'
								disabled={page.i > pageCount - 2} onClick={this.onForward}/>
					<span>{page.i * page.n} - {(page.i + 1) * page.n - 1} of {page.n * pageCount - 1}</span>
				</div>
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
