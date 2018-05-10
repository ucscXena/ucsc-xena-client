'use strict';
var jsc = require('jsverify');
var _ = require('lodash');
var {values, zipObject, map, times} = _;

var {oneof, constant, integer} = jsc;

var Let = f => f();

// flatmap an arbitrary, without shrinking.
var flatmap = (arb, fn) =>
	jsc.bless({
		generator: arb.generator.flatmap(v => fn(v).generator),
		shrink: jsc.shrink.noop,
		show: arb.show
	});

// Crude weighting of command options, to encourage more useful test sequences:
// if a command has an integer 'priority' field, make that many copies of the
// command prior to randomly selecting one.
var weightOptions = cmds =>
	_.flatMap(cmds, cmd => times(cmd.priority || 1, () => cmd));

// Return commands that are valid from the current state.
var availableCommands = (cmdIdx, state) =>
	weightOptions(values(cmdIdx).filter(cmd => cmd.canCreate(state)))
		.map(cmd => cmd.generate(state));

// Mutating array push that returns the array.
var push = (arr, val) => (arr.push(val), arr);

// Generate a command and state sequence of given size. Note this isn't
// tail recursive, so we're limited by stack size. Might want to rewrite as a loop.
function cmdSeqHelper(state, cmdIdx, size, acc = []) {
	return flatmap(
		oneof(availableCommands(cmdIdx, state)),
		cmd => size === 0 ? constant(push(acc, {state, cmd})) :
			   cmdSeqHelper(cmdIdx[cmd.type].apply(state, cmd), cmdIdx, size - 1, push(acc, {state, cmd})));
}

// Recompute state in a modified command sequence, returning no
// result if the new sequence is invalid.
// Returns [newSequence] or [].
function validSeq(cmdIdx, seq, state, acc = [], i = 0) {
	if (i === seq.length) {
		return [acc];
	}
	var cmd = seq[i].cmd,
		command = cmdIdx[cmd.type];
	if (!command.canApply(state, cmd)) {
		return [];
	}
	return validSeq(cmdIdx, seq, command.apply(state, cmd), push(acc, {state, cmd}), i + 1);
}

var dropNth = arr => i => arr.filter((c, j) => i !== j);

// shrink a command sequence.
// The complication in shrinking a sequence of commands is that the
// model state must be recomputed to reflect the modified sequence, and
// the modified sequence must be validated against the new state to confirm
// that the transitions are valid.
var shrinkSequence = cmdIdx => seq =>
	seq.length ?
		_.flatMap(times(seq.length, dropNth(seq)),  // set of all n-1 sequences.
		          s => validSeq(cmdIdx, s, seq[0].state)) :
		[];

function makeShrinkable(cmdIndx, arb) {
	arb.shrink = jsc.shrink.bless(shrinkSequence(cmdIndx));
	return arb;
};

var cmdSequence = (state, commands) =>
	Let((cmdIdx = zipObject(map(commands, 'type'), commands)) =>
		makeShrinkable(cmdIdx,
					   flatmap(integer(1, 20), steps => cmdSeqHelper(state, cmdIdx, steps))));

module.exports = cmdSequence;
