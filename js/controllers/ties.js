'use strict';
var _ = require('../underscore_ext');
var {compose, make, mount} = require('./utils');
var tiesQuery = require('../tiesQuery');
var Rx = require('../rx');

var collateDocs = patients => docs => {
    var idx = new Map();
    docs.forEach(({patientId, docs}) => {
        idx.set(patientId, _.getIn(docs, [0, 'id']));
    });
    return patients.map(p => ({patient: p, doc: idx.get(p)}));
};

// XXX fetch patient list!
var toPatientIds = arr => arr.map(s => s.replace(/-[01][01]$/, ''));

function fetchDocs(serverBus, state, newState) {
    var patients = toPatientIds(newState.cohortSamples);
	serverBus.next(['ties-doc-list',
            tiesQuery.docs(_.uniq(patients)).map(collateDocs(patients))]);
}

function fetchDoc(serverBus, state, newState) {
	var {showDoc, docs} = newState;
	if (showDoc != null) {
		serverBus.next(['ties-doc', tiesQuery.doc(docs[showDoc].doc)]);
	}
};

// underscore intersect sucks. Using a set, for O(n + m) performance.
var intersect = (c0, c1) => {
    var s = new Set(c0);
    return c1.filter(v => s.has(v));
};

var collateMatches = (patients, matches) =>
    intersect(patients, _.pluck(matches, 'patientId'));

function fetchMatches(serverBus, state, newState, term) {
    var patients = toPatientIds(newState.cohortSamples);
	serverBus.next(['ties-matches',
			Rx.Observable.zip(
                tiesQuery.concepts(term),
                tiesQuery.matches(patients, term),
                (concept, matches) => ({
                    cui: _.getIn(concept, [0,  'cui']), // XXX first cui
                    matches: collateMatches(patients, matches),
                    term}))]);
}

function findIndexAfter(coll, i, pred) {
	while (i < coll.length) {
		if (pred(coll[i])) {
			return i;
		}
	}
	return -1;
}

var advanceDoc = state => {
	var {docs, showDoc} = state,
		next = findIndexAfter(docs, showDoc + 1, ({doc}) => doc);
	return next === -1 ? _.dissoc(state, 'showDoc') :
		_.assoc(state, 'showDoc', next);
};

var advancePage = state => {
	var {page, showDoc} = state;
	return showDoc < page.n * (page.i + 1) ? state :
		_.updateIn(state, ['page', 'i'], i => i + 1);
};

var setKeep = (state, index, keep) => _.assocIn(state, ['filter', index], keep);

var tiesControls = {
	'ties-open': state => _.assoc(state,
			'open', true,
            'page', {i: 0, n: 10},
            'terms', [],
            'matches', {},
			'filter', {}), // init the filter
	'ties-dismiss': state => _.dissoc(state, 'open'), // XXX clean up doc list?
	'ties-add-term': (state, term) =>
		_.assoc(state, 'terms', _.conj(state.terms || [], term)),
	'ties-keep-row': (state, index, keep) => advancePage(advanceDoc(setKeep(state, index, keep))),
	'ties-keep-row-post!': fetchDoc,
	'ties-show-doc': (state, index) => _.assoc(state, 'showDoc', index),
	'ties-show-doc-post!': fetchDoc,
	'ties-hide-doc': state => _.dissoc(state, 'showDoc'),
	'ties-set-page': (state, page) => _.assoc(state, 'page', page),
	'ties-doc-list': (state, docs) => _.assoc(state, 'docs', docs),
	'ties-doc': (state, doc) => _.assoc(state, 'doc', doc),
	'ties-matches': (state, {matches, cui, term}) =>
        _.assocIn(state, ['matches', term], {cui, matches})
};

var spreadsheetControls = {
	'ties-open-post!': fetchDocs,
	'ties-add-term-post!': fetchMatches,
};

module.exports = compose(
		mount(make(spreadsheetControls), ['spreadsheet']),
		mount(make(tiesControls), ['spreadsheet', 'ties']));
