'use strict';

var React = require('react');
import PureComponent from '../PureComponent';
var {mapObject, values} = require('../underscore_ext');

var styles = {
	section: {
		borderTop: '1px solid black'
	},
	doc: {
		marginTop: 0,
		marginBottom: 0,
		cursor: 'pointer'
	}
};

var RETURN = 13;
var returnPressed = ev => ev.keyCode === RETURN;

var setKey = arr => arr.map((el, i) => React.cloneElement(el, {key: i}));

var pageSizes = [10, 20, 50, 100];

class Ties extends PureComponent {
	onForward = () => {
		var {onPage, state: {ties: {page: {i, n}}}} = this.props;
		onPage({i: i + 1, n});
	}

	onBack = () => {
		var {onPage, state: {ties: {page: {i, n}}}} = this.props;
		onPage({i: i - 1, n});
	}

	onPage = i => {
		var {onPage, state: {ties: {page: {n}}}} = this.props;
		onPage({i, n});
	}

	onPageSize = ev => {
		var {onPage, state: {ties: {page}}} = this.props,
			n = parseInt(ev.target.value, 10),
			i = Math.floor((page.n * page.i) / n);
		onPage({i, n});
	}

	onShowDoc = ev => {
		var doc = ev.target.dataset.doc;
		this.props.onShowDoc(doc);
	}

	onKeyDown = ev => {
		var value = ev.target.value.trim();
		if (returnPressed(ev) && value.length > 0) {
			this.props.onAddTerm(value);
			ev.target.value = '';
		}
	}

	render() {
		var {onHideDoc, state} = this.props,
			{terms = [], docs = [], matches = {},
				filter, showDoc, doc, page} = state.ties,
			byTerm = mapObject(matches, ({matches}) => new Set(matches));
		return (
			<div>
				<p style={styles.section}>
					<button onClick={this.props.onDismiss}>dismiss</button>
				</p>
				<p style={styles.section}>
					Terms: {terms.join(', ')} <br/>
					<input type='text' onKeyDown={this.onKeyDown}/>
				</p>
				<p style={styles.section}>
					Filter<br/>
					Keep {values(filter).filter(v => v === true).length}<br/>
					Drop {values(filter).filter(v => v === false).length}<br/>
					Undetermined {values(filter).filter(v => v == null).length}
				</p>
				<p style={styles.section}>
					showDoc {showDoc}
					{showDoc && <button onClick={onHideDoc}>hide</button>}<br/>
					doc {doc && doc.id} {doc && doc.text.slice(0, 100)}
				</p>
				<div style={styles.section}>
					Page {page.i}
					<button disabled={page.i === 0} onClick={this.onBack}>&lt;</button>
					<button onClick={this.onForward}>&gt;</button>
					<br/>
					Page length
					<select value={page.n} onChange={this.onPageSize}>
						{pageSizes.map(s => <option key={s} value={s}>{s}</option>)}
					</select>
					<br/>
					showing {page.i * page.n} - {(page.i + 1) * page.n - 1}
					<br/>
					{setKey(docs.slice(page.i * page.n, (page.i + 1) * page.n).map(
						({patient, doc}) =>
							<p style={styles.doc} data-doc={doc} onClick={this.onShowDoc}>{patient}: {doc} {terms.map(t => byTerm[t] && byTerm[t].has(patient) ? t : '').join(' ')}</p>))}
				</div>
			</div>);
	}
}

export default Ties;
