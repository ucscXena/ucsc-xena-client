// Adapted from redux-devtools, so we can use redux state monitors
// with xena state.
//

'use strict';

var _ = require('../underscore_ext');
var INIT_ACTION = {type: '@@INIT'};
var identity = state => state;
var notImplemented = (state, ac) => {
	console.log('No support for ' + ac.type);
	return state;
};

var liftState = state => ({state: state});

function logError(err) {
	if (typeof window === 'object' && typeof window.chrome !== 'undefined') {
		// In Chrome, rethrowing provides better source map support
		setTimeout(() => { throw err; });
	} else {
		console.error(err.stack || err);
	}
}

function liftReducer(reducer) {
	return (state, action) => {
		if (state.error) {
			return _.assoc(state, 'error',  'Interrupted by an error up the chain');
		}
		try {
			return liftState(reducer(state.state, action.action.payload));
		} catch (err) {
			logError(err);
			return _.assoc(state, 'error', err.toString());
		}
	};
}

function recomputeStates(liftedReducer, devState) {
	var {committedState, stagedActionIds, skippedActionIds, actionsById} = devState,
		computedStates = _.reduce(stagedActionIds.slice(1), // skip INIT_ACTION
					(acc, id) => skippedActionIds.indexOf(id) !== -1 ?
						_.conj(acc, acc[acc.length - 1]) :
						_.conj(acc, liftedReducer(acc[acc.length - 1], actionsById[id])),
					[liftState(committedState)]);
	return {...devState, computedStates};
}

var liftAction = action => ({action: {type: action[0], payload: action}});

function controls(liftedReducer, initialCommittedState) {
	return {
		'PERFORM_ACTION': (devState, {action}) => {
			var {nextActionId, actionsById, stagedActionIds, computedStates} = devState,
				id = nextActionId + 1,
				curr = computedStates[computedStates.length - 1],
				liftedAction = liftAction(action),
				next = liftedReducer(curr, liftedAction);

			return _.assoc(devState,
						'stagedActionIds', _.conj(stagedActionIds, id),
						'actionsById', _.assoc(actionsById, id, liftedAction),
						'computedStates', _.conj(computedStates, next),
						'nextActionId', id);
		},
		'RESET': devState => ({
			...devState,
			actionsById: {0: {action: INIT_ACTION}},
			nextActionId: 1,
			stagedActionIds: [0],
			skippedActionIds: [],
			committedState: initialCommittedState,
			computedStates: [liftState(initialCommittedState)]
		}),
		'ROLLBACK': devState => ({
			...devState,
			actionsById: {0: {action: INIT_ACTION}},
			nextActionId: 1,
			stagedActionIds: [0],
			skippedActionIds: [],
			computedStates: [devState.computedStates[0]]
		}),
		'COMMIT': ({computedStates, ...devState}) => ({
			...devState,
			actionsById: {0: {action: INIT_ACTION}},
			nextActionId: 1,
			stagedActionIds: [0],
			skippedActionIds: [],
			committedState: computedStates[computedStates.length - 1].state,
			computedStates: [_.last(computedStates)]
		}),
		'SWEEP': ({stagedActionIds, skippedActionIds, ...devState}) => recomputeStates(liftedReducer, {
			...devState,
			stagedActionIds: _.difference(stagedActionIds, skippedActionIds),
			skippedActionIds: []
		}),
		'TOGGLE_ACTION': ({skippedActionIds, ...devState}, {id}) => recomputeStates(liftedReducer,
			skippedActionIds.indexOf(id) === -1 ? { // add skipped action
				...devState,
				skippedActionIds: _.conj(skippedActionIds, id)
			} : {                                   // remove skipped action
				...devState,
				skippedActionIds: _.filter(skippedActionIds, i => i !== id)
			}
		),
		'JUMP_TO_STATE': notImplemented,
		'IMPORT_STATE': (devState, {nextLiftedState}) => recomputeStates(liftedReducer, nextLiftedState)
	};
}

function instrument(controller, monitorReducer, initialState) {
	var initialDevState = {
			nextActionId: 1,
			actionsById: {0: {action: INIT_ACTION}},
			skippedActionIds: [],
			stagedActionIds: [0],
			computedStates: [{state: initialState}],
			committedState: initialState,
			select: s => s,
			monitorState: monitorReducer(undefined, {})
		},
		liftedReducer = liftReducer(controller.action),
		ctrls = controls(liftedReducer, initialState);

	return (state, action) => {
		var s = (ctrls[action.type] || identity)(state || initialDevState, action);
		return {
			...s,
			monitorState: monitorReducer(s.monitorState, action)
		};
	};
}

import React, { Children } from 'react';
function createDevTools(children) {
	const monitorElement = Children.only(children);
	const monitorProps = monitorElement.props;
	const Monitor = monitorElement.type;
	const enhancer = (controller, initialState) => instrument(
		controller,
		(state, action) => Monitor.update(monitorProps, state, action),
		initialState
	);
	var DevTools = React.createClass({
		render: function() {
			return (<Monitor {...this.props} {...monitorProps}/>);
		}
	});
	DevTools.instrument = enhancer;
	return DevTools;
}

module.exports = {
	instrument,
	createDevTools
};
