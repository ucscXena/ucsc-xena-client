'use strict';

var React = require('react');
import {Card} from 'react-toolbox/lib/card';
import PureComponent from '../PureComponent';
import ConceptSuggest from './ConceptSuggest';
import Dropdown from 'react-toolbox/lib/dropdown';
import {IconButton} from 'react-toolbox/lib/button';
var {isString, Let, last, initial, groupBy, mapObject,
	sortBy, flatmap, times, pick} = require('../underscore_ext');

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

//function logOverlaps(xml) {
//	var matches = xml.querySelectorAll('Concept'),
//		ranges = map(matches, c =>
//			({concept: c,
//				start: parseInt(c.parentNode.attributes.startOffset.value, 10),
//				end: parseInt(c.parentNode.attributes.endOffset.value, 10)}));
//	ranges.forEach((r, i) => {
//		ranges.slice(i + 1).forEach(s => {
//			if (s !== r && s.start < r.end && s.end > r.start) {
//				console.log('overlap', s, r);
//			}
//		});
//	});
//}

var push = (arr, v) => (arr.push(v), arr);

function transition(list, i = 0, last = 0, ctx = new Set(), acc = []) {
	if (i === list.length) {
		return acc;
	}
	var g = list[i],
		coord = g[0].match[g[0].type],
		r = {start: last, end: coord, ctx: Array.from(ctx)},
		{start = [], end = []} = groupBy(g, 'type');

	// There's a subtle order dependency here on certain edge cases.
	// On a zero-length match, doing 'end' then 'start' will erroneously
	// set the match on. On adjacent matches with the same index, doing
	// 'start' then 'end' will erroneously set the match off. So, we
	// filter zero-length matches.
	end.forEach(t => ctx.delete(t.match.index));
	start.forEach(t => ctx.add(t.match.index));

	return transition(list, i + 1, coord, ctx, push(acc, r));
}

// Wish this were simpler. We have a list of possibly overlapping match regions.
// We need to find contiguous regions of color. The color of the region depends
// on the set of matches overlapping it.
// Strategy is to put all the start & end coords together, group by coord,
// sort by coord, then keep a running tally of overlaps by adding to the tally
// for each 'start' coord, and removing from the tally for each 'end' coord, and
// emitting a region for each coord group.
function computeRegions(matches, text) {
	var nzMatches = matches.filter(({start, end}) => start !== end), // matches having non-zero length
		transitions = groupBy(
			nzMatches.map(m => ({type: 'start', match: m}))
				.concat(nzMatches.map(m => ({type: 'end', match: m}))),
			t => t.match[t.type]),
		ordered = sortBy(Object.values(transitions), g => g[0].match[g[0].type]),
		regions = transition(ordered),
		ptAtEnd = {
			start: regions[regions.length - 1].end,
			end: text.length,
			ctx: []};

	return [...regions, ptAtEnd];
}

function highlightRegions(doc, terms) {
	var highlights = flatmap(terms, (term, index) =>
			doc.highlights[term].map(hl => ({...hl, index})));

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

var newlines = s =>
	Let ((segments = s.split(/\n/)) =>
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
		var {doc, terms} = this.props;
		if (!doc) {
			return null;
		}
		var regions = highlightRegions(doc, terms);
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

	render() {
		var {onAddTerm, state} = this.props,
			{
				terms = [], docs, matches = {}, showWelcome = true,
				filter, showDoc, doc, page, concepts = []
			} = state.ties,
			byTerm = mapObject(matches, ({matches}) => new Set(matches)), // XXX put in selector
			docTerms = doc ? terms.filter(term => byTerm[term].has(doc.patient)) : [],
			dialogProps = {
				dialogActive: showDoc != null,
				onKeepRow: this.onKeepRow,
				patient: showDoc != null && docs[showDoc].patient,
				terms: docTerms,
				getHighlight: getHighlight,
				closeReport: this.onHideDoc
			},
			pageCount = Math.ceil((docs || []).length / page.n),
			pagenationHandlers = pick(this, ['onPage', 'onPageSize', 'onForward', 'onBack']);
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
				<XDialog {...dialogProps}>
					<DocText doc={doc} terms={docTerms}/>
				</XDialog>
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
