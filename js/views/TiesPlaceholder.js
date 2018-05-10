'use strict';

var React = require('react');
import PureComponent from '../PureComponent';
import ConceptSuggest from './ConceptSuggest';
var {times, mapObject, values} = require('../underscore_ext');

var styles = {
	section: {
		borderTop: '1px solid black'
	},
	doc: {
		marginTop: 0,
		marginBottom: 0,
		cursor: 'pointer'
	},
	show: {
		backgroundColor: '#EEEEFF'
	}
};

var setKey = arr => arr.map((el, i) => React.cloneElement(el, {key: i}));

var pageSizes = [10, 20, 50, 100];

var filterIcon = (hasDoc, filter) =>
	!hasDoc ? '-' :
	filter == null ? '\u00A0' :
	filter ? 'y' :
	'n';

class Ties extends PureComponent {
	onForward = () => {
		var {onPage, state: {ties: {page: {i, n}}}} = this.props;
		onPage({i: i + 1, n});
	}

	onBack = () => {
		var {onPage, state: {ties: {page: {i, n}}}} = this.props;
		onPage({i: i - 1, n});
	}

	onPage = ev => {
		var i = parseInt(ev.target.value, 10) - 1,
			{onPage, state: {ties: {page: {n}}}} = this.props;
		onPage({i, n});
	}

	onPageSize = ev => {
		var {onPage, state: {ties: {page}}} = this.props,
			n = parseInt(ev.target.value, 10),
			i = Math.floor((page.n * page.i) / n);
		onPage({i, n});
	}

	onShowDoc = ev => {
		var index = parseInt(ev.target.dataset.index, 10);
		this.props.onShowDoc(index);
	}

	onKeepRow = ev => {
		var keep = ev.target.dataset.keep === 'true',
			{onKeepRow, state: {ties: {showDoc}}} = this.props;

		onKeepRow(showDoc, keep);
	}

	render() {
		var {onHideDoc, onAddTerm, state} = this.props,
			{terms = [], docs, matches = {},
				filter, showDoc, doc, page, concepts = []} = state.ties,
			pageCount = Math.ceil((docs || []).length / page.n),
			byTerm = mapObject(matches, ({matches}) => new Set(matches)); // XXX put in selector
		return (
			<div>
				<p style={styles.section}>
					<button onClick={this.props.onDismiss}>dismiss</button>
				</p>
				<div style={styles.section}>
					Terms: {terms.map(t => matches[t] ? t : `${t} (loading)`).join(', ')} <br/>
					<ConceptSuggest onAddTerm={onAddTerm} concepts={concepts}/>
				</div>
				<p style={styles.section}>
					Filter<br/>
					Keep {values(filter).filter(v => v === true).length}<br/>
					Drop {values(filter).filter(v => v === false).length}
				</p>
				<p style={styles.section}>
					showDoc {showDoc}
					{showDoc && <button onClick={onHideDoc}>hide</button>}<br/>
					{showDoc && <button data-keep={true} onClick={this.onKeepRow}>keep</button>}<br/>
					{showDoc && <button data-keep={false} onClick={this.onKeepRow}>discard</button>}<br/>
					doc {doc && doc.id} {doc && doc.text.slice(0, 100)}
				</p>
				<div style={styles.section}>
					Page
					<select value={page.i + 1} onChange={this.onPage}>
						{times(pageCount, i => <option key={i} value={i + 1}>{i + 1}</option>)}
					</select>
					<button disabled={page.i === 0} onClick={this.onBack}>&lt;</button>
					<button disabled={page.i > pageCount - 2} onClick={this.onForward}>&gt;</button>
					<br/>
					Page length
					<select value={page.n} onChange={this.onPageSize}>
						{pageSizes.map(s => <option key={s} value={s}>{s}</option>)}
					</select>
					<br/>
					showing {page.i * page.n} - {(page.i + 1) * page.n - 1}
					<br/>
					{docs ? setKey(docs.slice(page.i * page.n, (page.i + 1) * page.n).map(
						({patient, doc}, i) =>
							<p style={{...styles.doc, ...(page.i * page.n + i === showDoc ? styles.show : {})}}
							   data-index={page.i * page.n + i}
							   onClick={doc ? this.onShowDoc : undefined}>
							   {filterIcon(doc, filter[page.i * page.n + i])}
							   {' '}
							   {patient}: {doc} {terms.map(t => byTerm[t] && byTerm[t].has(patient) ? t : '').join(' ')}
						   </p>)) : "loading docs..."}
				</div>
			</div>);
	}
}

export default Ties;
