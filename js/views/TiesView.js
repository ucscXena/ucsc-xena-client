'use strict';

var React = require('react');
import {Card} from 'react-toolbox/lib/card';
import PureComponent from '../PureComponent';
import ConceptSuggest from './ConceptSuggest';
import Dropdown from 'react-toolbox/lib/dropdown';
import {Button, IconButton} from 'react-toolbox/lib/button';

var intvlTree = require('static-interval-tree');
var {
	memoize1, uniq, partitionN, isString, Let, last, initial, mapObject,
	sortBy, flatmap, times, pick, pluck
} = require('../underscore_ext');

var XDialog = require('./XDialog');

var compStyles = require('./TiesView.module.css');
var typStyles = require('../../css/typography.module.css');
var classNames = require('classnames');

var setKey = arr => arr.map((el, i) => isString(el) ? el :
	React.cloneElement(el, {key: i}));

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

// Highlights may overlap. To compute contiguous color regions, put highlights
// into an interval tree, split the length of the text at each highlight boundary,
// then query all the resulting regions to find highlights overlapping the region.
function computeRegions(matches, text) {
	var idx = intvlTree.index(matches),
		coords = sortBy(
			uniq([0, text.length, ...pluck(matches, 'start'), ...pluck(matches, 'end')]),
			x => x);

	return initial(partitionN(coords, 2, 1)).map(([start, end]) => ({
		start, end,
		ctx: uniq(pluck(intvlTree.matches01(idx, {start, end}), 'index'))
	}));
}

var stringMatches = (terms, text) =>
	Let((lc = text.toLowerCase()) =>
		flatmap(terms, (term, index) =>
			Let((lcterm = term.toLowerCase(), i = lc.indexOf(lcterm)) =>
				i === -1 ? [] : [{start: i, end: i + lcterm.length, index}])));

function highlightRegions(doc, terms) {
	if (!doc) {
		return [{start: 0, end: 0, ctx: []}];
	}
	var conceptHighlights = flatmap(terms, (term, index) =>
			(doc.highlights[term] || []).map(hl => ({...hl, index}))),
		highlights = conceptHighlights.concat(stringMatches(terms, doc.text));

	return highlights.length ? computeRegions(highlights, doc.text) :
		[{start: 0, end: doc.text.length, ctx: []}];
}

var highlights = [
	"#aec7e8", // light blue
	"#dbdb8d", // light mustard
	"#ff9896", // light salmon
	"#c5b0d5", // light lavender
	"#ffbb78", // light orange
	"#c49c94", // light tan
	"#f7b6d2", // light pink
	"#98df8a", // light green
	"#c7c7c7",  // light grey
	"#1f77b4", // dark blue
	"#d62728", // dark red
	"#9467bd", // dark purple
	"#ff7f0e", // dark orange
	"#8c564b", // dark brown
	"#e377c2", // dark pink
	"#2ca02c", // dark green
	"#bcbd22" // dark mustard
];

var getHighlight = i => highlights[i % highlights.length];

// drop trailing whitespace, and consecutive newlines beyond two.
var reduceWhiteSpace = s =>
	s.replace(/ +\n/g, '\n').replace(/\n\n(\n)+/g, '\n\n');

var newlines = s =>
	Let((segments = reduceWhiteSpace(s).split(/\n/)) =>
		[...flatmap(initial(segments), s => [s, <br/>]), last(segments)]);


var percent = n => (100 / n).toPrecision(3);

var gradientStops = idxs =>
	Let((pct = percent(idxs.length)) =>
		idxs.map(i => `${getHighlight(i)} ${pct}%`));

// XXX Should check this cross-browser. prefixer, even if it's working in the
// build, won't help us for assigned styles.
var gradient = idxs =>
	`linear-gradient(to bottom, ${gradientStops(idxs).join(', ')}, ${getHighlight(last(idxs))})`;

var splitText = (regions, text) =>
	setKey(regions.map(({start, end, ctx}) => (
		<span style={ctx.length ? {background: gradient(ctx)} : {}}>
			{setKey(newlines(text.slice(start, end)))}
		</span>)));

// highlight compute in component to avoid recompute
class DocText extends PureComponent {
	render() {
		var {doc, regions} = this.props;
		if (!doc) {
			return null;
		}
		return <p>{splitText(regions, doc.text)}</p>;
	}
}

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

	// Trying a local cache pattern, instead of adding to the application selector.
	// The important bits are that the memoize call happens when the instance
	// is instantiated, and the es6 initialization form binds 'this' in the
	// method.
	byTerm = Let(
		(fn = memoize1(matches =>
			mapObject(matches, ({matches}) => new Set(matches)))) =>
			() => fn(this.props.state.ties.matches || {}));

	getRegions = Let(
		(fn = memoize1(highlightRegions)) =>
			() => Let(({terms = [], doc} = this.props.state.ties) => fn(doc, terms)));

	render() {
		var {onAddTerm, state} = this.props,
			{
				terms = [], docs, matches = {}, showWelcome = true,
				filter, showDoc, doc, page, concepts = []
			} = state.ties,
			byTerm = this.byTerm(),
			docTerms = doc ? terms.map((term, i) => ({term, color: getHighlight(i)}))
					.filter(({term}) => byTerm[term] && byTerm[term].has(doc.patient)) :
				[],
			regions = this.getRegions(),
			dialogProps = {
				dialogActive: showDoc != null,
				onKeepRow: this.onKeepRow,
				patient: showDoc != null && docs[showDoc].patient,
				terms: docTerms,
				closeReport: this.onHideDoc
			},
			pageCount = Math.ceil((docs || []).length / page.n),
			pagenationHandlers = pick(this, ['onPage', 'onPageSize', 'onForward', 'onBack']);
		return (
			<Card className={compStyles.tiesView}>
				<div className={compStyles.tiesViewHeader}>
					<div className={compStyles.tiesFilter}>
						<ConceptSuggest onAddTerm={onAddTerm} concepts={concepts}/>
					</div>
					<Pagenation {...pagenationHandlers} page={page} pageCount={pageCount}/>
				</div>
				<div className={compStyles.tiesFilterTerms}>
					<span>Search Terms:</span><span>{terms.map(t => matches[t] ? t : `${t} (loading)`).join(', ')}</span>
				</div>
				<div className={compStyles.tiesTable}>
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
					)) : null}
				</div>
				<Pagenation {...pagenationHandlers} page={page} pageCount={pageCount}/>
				<XDialog {...dialogProps}>
					<DocText doc={doc} regions={regions}/>
				</XDialog>
				{showWelcome ? <div className={compStyles.tiesWelcome}>
					<div className={compStyles.welcomeTiesText}>
						<h1 className={typStyles.mdHeadline}>Welcome to the Pathology Report Filtering Tool by Ties</h1>
						<h2 className={typStyles.mdSubhead}>This tool allows users to view and search the pathology
							reports,
							using them to <br/>select samples of interest and then create a filtered column based on the
							samples<br/>
							of interest.</h2>
						<h2 className={typStyles.mdSubhead}>Begin by searching
							using
							key words of interest.</h2>
						<Button accent onClick={this.props.onDismissWelcome} className={compStyles.tiesCreateButton}>Start</Button>
					</div>
				</div> : docs ? null : <div className={compStyles.tiesLoading}>
					<div className={compStyles.loadingTiesText}>
						<div className={typStyles.mdSubhead}>Pathology Report Filtering Tool Loading...</div>
					</div>
				</div>}
			</Card>
		);
	}
}

export default Ties;
