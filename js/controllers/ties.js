'use strict';
var _ = require('../underscore_ext');
var {compose, make, mount} = require('./utils');
var tiesQuery = require('../tiesQuery');
//var Rx = require('../rx');
var {fetchSurvival} = require('./common');

var collateDocs = patients => docs => {
    var idx = new Map();
    docs.forEach(({patientId, docs}) => {
        idx.set(patientId, _.getIn(docs, [0, 'id']));
    });
    return patients.map(p => ({patient: p, doc: idx.get(p)}));
};

function fetchDocs(serverBus, patients) {
	serverBus.next(['ties-doc-list',
            tiesQuery.docs(patients).map(collateDocs(patients))]);
}

function fetchDoc(serverBus, state, newState) {
	var {showDoc, docs} = newState;
	if (showDoc != null) {
		serverBus.next(['ties-doc', tiesQuery.doc(docs[showDoc].doc)]);
	}
};

// XXX Make this transient. We don't need to save this data.
function fetchConcepts(serverBus) {
	serverBus.next(['ties-concepts', tiesQuery.goodConcepts()]);
};

// underscore intersect sucks. Using a set, for O(n + m) performance.
var intersect = (c0, c1) => {
	var s = new Set(c0);
	return c1.filter(v => s.has(v));
};

var union = (c0, c1) => {
	var s = new Set(c0);
	c1.forEach(v => s.add(v));
	return Array.from(s.values());
};

var unionOfHits = (h0, h1) =>
	union(_.pluck(h0, 'patientId'), _.pluck(h1, 'patientId'));

function fetchMatches(serverBus, state, newState, term) {
	var patients = _.getIn(newState, ['survival', 'patient', 'data', 'codes']);
	serverBus.next(['ties-matches',
		// Running these sequentially because the backend falls over if we send them in parallel.
		// This is super slow.
		tiesQuery.conceptMatches(patients, term).flatMap(conceptHits =>
			tiesQuery.textMatches(patients, term).map(textHits => ({conceptHits, textHits})))
			.map(({conceptHits, textHits}) => intersect(patients, unionOfHits(conceptHits, textHits))),
		term]);
}

function findIndexAfter(coll, i, pred) {
	while (i < coll.length) {
		if (pred(coll[i])) {
			return i;
		}
		++i;
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

var reset = state => _.assoc(state, 'open', false, 'docs', undefined);

var tiesControls = {
	'ties-open': state => _.assoc(state,
			'open', true,
			'page', {i: 0, n: 10},
			'terms', [],
			'showDoc', undefined,
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
	'ties-concepts': (state, concepts) => _.assoc(state, 'concepts', concepts),
	'ties-doc': (state, doc) => _.assoc(state, 'doc', doc),
	'ties-matches': (state, matches, term) =>
		_.assocIn(state, ['matches', term], {matches}),
	'ties-matches-error': (state, err, term) =>
		_.updateIn(state, ['terms'], terms => _.without(terms, term)),
	cohort: reset,
	cohortReset: reset,
	manifest: reset
};

var spreadsheetControls = {
	'ties-add-term-post!': fetchMatches,
	'km-survival-data-post!': (serverBus, state, newState) => {
		var patients = _.getIn(newState, ['survival', 'patient', 'data', 'codes']),
			docs = _.getIn(newState, ['ties', 'docs']),
			open = _.getIn(newState, ['ties', 'open']);
		if (open && !docs) {
			fetchDocs(serverBus, patients);
		}
	}
};

var controls = {
	'ties-open-post!': (serverBus, state, newState) => {
		var patients = _.getIn(newState, ['spreadsheet', 'survival', 'patient', 'data', 'codes']),
			docs = _.getIn(newState, ['spreadsheet', 'ties', 'docs']),
			concepts = _.getIn(newState, ['spreadsheet', 'ties', 'concepts']);
		if (!concepts) {
			fetchConcepts(serverBus);
		}
		if (patients) {
			if (!docs) {
				fetchDocs(serverBus, patients);
			}
		} else {
			fetchSurvival(serverBus, newState);
		}
	},
};

module.exports = compose(
		make(controls),
		mount(make(spreadsheetControls), ['spreadsheet']),
		mount(make(tiesControls), ['spreadsheet', 'ties']));
