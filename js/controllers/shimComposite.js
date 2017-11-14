'use strict';
var {assoc, updateIn} = require('../underscore_ext');

// Lift in 'spreadsheet' subtree.
var sslifter = f => state => updateIn(state, ['spreadsheet'], f);

var lift = sslifter(state => assoc(state,
		'cohort', state.cohort ? [state.cohort] : [],
		'cohortSamples', state.cohortSamples ? [state.cohortSamples] : []));
var unlift = sslifter(state => assoc(state,
		'cohort', state.cohort[0],
		'cohortSamples', state.cohortSamples[0]));

module.exports = {
	controller: controller => ({
			action: (state, ac) => unlift(controller.action(lift(state), ac)),
			postAction: (bus, state, nextState, ac) =>
				controller.postAction(bus, lift(state), lift(nextState), ac)}),
	lift
};
