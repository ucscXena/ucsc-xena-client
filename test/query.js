/*global require: false, it: false, console: false, describe: false, mocha: false */

var {assoc, conj, getIn, identity, Let, omit, updateIn} = require('../js/underscore_ext').default;
var Rx = require('../js/rx').default;
var {of} = Rx.Observable;
var {Subject} = Rx;
var createStore = require('../js/store');
var controlRunner = require('../js/controlRunner').default;
import {make as makeControls, compose} from '../js/controllers/utils';
import query from '../js/controllers/query2';
import {diff} from 'just-diff';

//var query = require('../js/controllers/query');

var assert = require('assert');

var connector = (store, state, controller) =>
	Rx.Observable.merge(store.serverCh, store.uiCh)
		.scan(controlRunner(store.serverBus, controller), state);

describe('query', function () {
	it('should be happy eventually', function (done) {
		// verify async testing pattern with rx
		of(true).delay(10).subscribe(v => {
			assert(v, 'is happy');
			done();
		});
	});
	it('should be a controller', function (done) {
		// verify async testing of controller api
		var controls = {
			hello: state => assoc(state, 'hello', true)
		};
		var controller = makeControls(controls);
		var store = createStore(),
			state = {},
			obs = connector(store, state, controller);
		obs.subscribe(state => {
			if (state.hello) {
				assert(true, 'is happy');
				done();
			}
		});
		store.uiCh.next(['foo']);
		store.uiCh.next(['hello']);
	});
	it('should run side effects', function (done) {
		// verify async testing of controller api, with side effects
		var controls = {
			thingy: state => assoc(state, 'thingy', 'left'),
			'thingy-post!': (serverBus, state, newState) => {
				serverBus.next([newState.thingy, of('red').delay(20)]);
			},
			left: state => assoc(state, 'left', 'red')
		};
		var controller = makeControls(controls);
		var store = createStore(),
			state = {},
			obs = connector(store, state, controller);
		obs.subscribe(state => {
			if (state.left) {
				assert(state.thingy, 'left');
				assert(state.left, 'red');
				done();
			}
		});
		store.uiCh.next(['foo']);
		store.uiCh.next(['thingy']);
	});
	it('should resolve declarative fetch', function (done) {
		var fetchMethods = {
			samples: (/*cohort*/) => of(['a', 'b', 'c']).delay(10)
		};
		var cachePolicy = {
			samples: identity
		};
		var dataRequests = state => [
			...(state.cohort ? [['samples', state.cohort]] : [])
		];
		var controls = {
			cohort: (state, c) => assoc(state, 'cohort', c),
			foo: (state, val) => assoc(state, 'foo', val)
		};
		var {controller: fetchController} =
			query(fetchMethods, dataRequests, cachePolicy, 'tester');

		var controller = compose(fetchController, makeControls(controls));
		var store = createStore(),
			state = {},
			obs = connector(store, state, controller);
		obs.subscribe(state => {
			if (getIn(state, ['tester', 'samples'])) {
				assert.deepEqual(state.tester.samples, {'smith': ['a', 'b', 'c']});
				assert(state.foo, 'baz');
				done();
			}
		});
		store.uiCh.next(['foo', 'bar']);
		store.uiCh.next(['foo', 'baz']);
		store.uiCh.next(['cohort', 'smith']);
	});
	it('should resolve declarative fetch with reference key', function (done) {
		var serverData = {
			A: {smith: [1, 2, 3]},
			B: {smith: [4, 5, 6]}
		};
		var fetchMethods = {
			samples: (cohort, servers) => of(
				servers.map(s => serverData[s][cohort]).flat()).delay(10)
		};
		var cachePolicy = {
			samples: identity
		};
		var dataRequests = state => [
			...(state.cohort ? [['samples', state.cohort, ['servers']]] : [])
		];
		var controls = {
			cohort: (state, c) => assoc(state, 'cohort', c),
			foo: (state, val) => assoc(state, 'foo', val)
		};
		var {controller: fetchController} =
			query(fetchMethods, dataRequests, cachePolicy, 'tester');

		var controller = compose(fetchController, makeControls(controls));
		var store = createStore(),
			state = {servers: ['A', 'B']},
			obs = connector(store, state, controller);
		obs.subscribe(state => {
			if (getIn(state, ['tester', 'samples'])) {
				assert.deepEqual(state.tester.samples, {'smith': [1, 2, 3, 4, 5, 6]});
				assert(state.foo, 'baz');
				done();
			}
		});
		store.uiCh.next(['foo', 'bar']);
		store.uiCh.next(['foo', 'baz']);
		store.uiCh.next(['cohort', 'smith']);
	});

	var diffMsg = (i, state, expected) =>
		`Step ${i / 2}, state = ${JSON.stringify(state, null, 4)}. Diff from expected ${JSON.stringify(diff(state, expected), null, 4)}` ;
	var assertStateMount = mount =>
		Let((drop = state => updateIn(state, [mount], m => omit(m, (v, k) => k.startsWith('_')))) =>
			(state, expected, i) =>
				Let((s = drop(state), e = drop(expected)) =>
					assert.deepEqual(s, e, diffMsg(i, s, e))));

	var getQueue = () => {
		var serverQueue = [];
		var queue = () => {
			var s = new Subject();
			serverQueue.push(s);
			return s;
		};
		return {queue, serverQueue};
	};
	var server = 'server'; // semaphores for dispatch
	var ui = 'ui';
	var finish = 'finish';
	var reload = 'reload';
	var noop = 'noop';
	var log = false ? console.log : identity; // edit to enable debug logging
	var spyController = {
		action: (state, action, ...args) => {
			log('action', action, ...args);
			return state;
		},
		postAction: (serverBus, state, newState) => {
			log('nextState', newState);
		}
	};
	function stepper({queue, state, getController, assertState, done, actions}) {
		function load() {
			var {store, controller} = getController();
			var obs = connector(store, state, compose(spyController, controller));
			var sub = obs.subscribe(next => {
				state = next;
			});
			return {sub, store};
		}
		var {sub, store} = load();
		function go(arr, i = 0)  {
			if (i < arr.length) {
				let [bus] = arr[i],
					expected = arr[i + 1];
				if (bus === server) {
					let [, req, action] = arr[i];
					var subject = queue.serverQueue[req];
					assert(subject, `Missing server fetch ${req}`);
					subject.next(action);
					setTimeout(() => {
						assertState(state, expected, i);
						go(arr, i + 2);
					}, 2);
				} else if (bus === finish) {
					done();
				} else if (bus === noop) {
					setTimeout(() => {
						assertState(state, expected, i);
						go(arr, i + 2);
					}, 2);
				} else if (bus === reload) {
					sub.unsubscribe();
					var l = load();
					sub = l.sub;
					store = l.store;
					setTimeout(() => {
						assertState(state, expected, i);
						go(arr, i + 2);
					}, 2);
				} else {
					let [, action] = arr[i];
					store.uiCh.next(action);
					setTimeout(() => {
						assertState(state, expected, i);
						go(arr, i + 2);
					}, 2);
				}
			}
		}
		go(actions);
	}
	it('should re-fetch when reference changes', function (done) {
		var mount = 'tester';
		var assertState = assertStateMount(mount);
		var queue = getQueue();
		var fetchMethods = {
			samples: (/*cohort, servers*/) => queue.queue()
		};
		var cachePolicy = {
			samples: identity
		};
		var dataRequests = state => [
			...(state.cohort ? [['samples', state.cohort, ['servers']]] : [])
		];
		var controls = {
			addServer: (state, s) => updateIn(state, ['servers'],
				svrs => conj(svrs, s)),
			cohort: (state, c) => assoc(state, 'cohort', c),
			foo: (state, val) => assoc(state, 'foo', val)
		};
		var getController = () => {
			var {controller: fetchController} =
					query(fetchMethods, dataRequests, cachePolicy, mount),
				controller = compose(fetchController, makeControls(controls)),
				store = createStore();
			return {controller, store};
		};
		var state = {servers: ['A', 'B']};

		stepper({queue, state, getController, assertState, done, actions: [
			[ui, ['foo', 'bar']], {foo: 'bar', servers: ['A', 'B']},
			[ui, ['foo', 'baz']], {foo: 'baz', servers: ['A', 'B']},
			[ui, ['cohort', 'smith']],
				{foo: 'baz', cohort: 'smith', servers: ['A', 'B']},
			[server, 0, [1, 2, 3, 4, 5, 6]],
				{foo: 'baz', cohort: 'smith', servers: ['A', 'B'],
					tester: {samples: {smith: [1, 2, 3, 4, 5, 6]}}},
			[ui, ['addServer', 'C']],
				{foo: 'baz', cohort: 'smith', servers: ['A', 'B', 'C'],
					tester: {samples: {smith: [1, 2, 3, 4, 5, 6]}}},
			[server, 1, [1, 2, 3, 4, 5, 6, 7, 8, 9]],
				{foo: 'baz', cohort: 'smith', servers: ['A', 'B', 'C'],
					tester: {samples: {smith: [1, 2, 3, 4, 5, 6, 7, 8, 9]}}},
			[finish]
		]});
	});
	it('should re-fetch when reference changes before load', function (done) {
		var mount = 'tester';
		var assertState = assertStateMount(mount);
		var queue = getQueue();
		var fetchMethods = {
			samples: (/*cohort, servers*/) => queue.queue()
		};
		var cachePolicy = {
			samples: identity
		};
		var dataRequests = state => [
			...(state.cohort ? [['samples', state.cohort, ['servers']]] : [])
		];
		var controls = {
			addServer: (state, s) => updateIn(state, ['servers'],
				svrs => conj(svrs, s)),
			cohort: (state, c) => assoc(state, 'cohort', c),
			foo: (state, val) => assoc(state, 'foo', val)
		};
		var getController = () => {
			var {controller: fetchController} =
					query(fetchMethods, dataRequests, cachePolicy, mount),
				controller = compose(fetchController, makeControls(controls)),
				store = createStore();
			return {controller, store};
		};
		var state = {servers: ['A', 'B']};

		stepper({queue, state, getController, assertState, done, actions: [
			[ui, ['foo', 'bar']], {foo: 'bar', servers: ['A', 'B']},
			[ui, ['foo', 'baz']], {foo: 'baz', servers: ['A', 'B']},
			[ui, ['cohort', 'smith']],
				{foo: 'baz', cohort: 'smith', servers: ['A', 'B']},
			[ui, ['addServer', 'C']],
				{foo: 'baz', cohort: 'smith', servers: ['A', 'B', 'C']},
			[server, 0, 'stale response that should be dropped'],
				{foo: 'baz', cohort: 'smith', servers: ['A', 'B', 'C'], tester: {}},
			[server, 1, [1, 2, 3, 4, 5, 6, 7, 8, 9]],
				{foo: 'baz', cohort: 'smith', servers: ['A', 'B', 'C'],
					tester: {samples: {smith: [1, 2, 3, 4, 5, 6, 7, 8, 9]}}},
			[finish]
		]});
	});
	it('should re-fetch when reference changes before load #2', function (done) {
		var mount = 'tester';
		var assertState = assertStateMount(mount);
		var queue = getQueue();
		var fetchMethods = {
			samples: (/*cohort, servers*/) => queue.queue()
		};
		var cachePolicy = {
			samples: identity
		};
		var dataRequests = state => [
			...(state.cohort ? [['samples', state.cohort, ['servers']]] : [])
		];
		var controls = {
			addServer: (state, s) => updateIn(state, ['servers'],
				svrs => conj(svrs, s)),
			cohort: (state, c) => assoc(state, 'cohort', c),
			foo: (state, val) => assoc(state, 'foo', val)
		};
		var getController = () => {
			var {controller: fetchController} =
					query(fetchMethods, dataRequests, cachePolicy, mount),
				controller = compose(fetchController, makeControls(controls)),
				store = createStore();
			return {controller, store};
		};
		var state = {servers: ['A', 'B']};

		stepper({queue, state, getController, assertState, done, actions: [
			[ui, ['foo', 'bar']], {foo: 'bar', servers: ['A', 'B']},
			[ui, ['foo', 'baz']], {foo: 'baz', servers: ['A', 'B']},
			[ui, ['cohort', 'smith']],
				{foo: 'baz', cohort: 'smith', servers: ['A', 'B']},
			[ui, ['addServer', 'C']],
				{foo: 'baz', cohort: 'smith', servers: ['A', 'B', 'C']},
			[server, 0, 'stale response that should be dropped'],
				{foo: 'baz', cohort: 'smith', servers: ['A', 'B', 'C'], tester: {}},
			[server, 1, [1, 2, 3, 4, 5, 6, 7, 8, 9]],
				{foo: 'baz', cohort: 'smith', servers: ['A', 'B', 'C'],
					tester: {samples: {smith: [1, 2, 3, 4, 5, 6, 7, 8, 9]}}},
			[finish]
		]});
	});
	it('should handle reload', function (done) {
		var mount = 'tester';
		var assertState = assertStateMount(mount);
		var queue = getQueue();
		var fetchMethods = {
			samples: (/*cohort, servers*/) => queue.queue()
		};
		var cachePolicy = {
			samples: identity
		};
		var dataRequests = state => [
			...(state.cohort ? [['samples', state.cohort, ['servers']]] : [])
		];
		var controls = {
			addServer: (state, s) => updateIn(state, ['servers'],
				svrs => conj(svrs, s)),
			cohort: (state, c) => assoc(state, 'cohort', c),
			foo: (state, val) => assoc(state, 'foo', val)
		};
		var getController = () => {
			var {controller: fetchController} =
				query(fetchMethods, dataRequests, cachePolicy, 'tester'),
				store = createStore(),
				controller = compose(fetchController, makeControls(controls));
			return {controller, store};
		};
		var state = {servers: ['A', 'B']};

		stepper({queue, state, getController, assertState, done, actions: [
			[ui, ['foo', 'bar']], {foo: 'bar', servers: ['A', 'B']},
			[reload], {foo: 'bar', servers: ['A', 'B']},
			[ui, ['foo', 'baz']], {foo: 'baz', servers: ['A', 'B']},
			[finish]]});
	});
	it('should fetch over page loads', function (done) {
		var mount = 'tester';
		var assertState = assertStateMount(mount);
		var queue = getQueue();
		var fetchMethods = {
			samples: (/*cohort, servers*/) => queue.queue()
		};
		var cachePolicy = {
			samples: identity
		};
		var dataRequests = state => [
			...(state.cohort ? [['samples', state.cohort, ['servers']]] : [])
		];
		var controls = {
			addServer: (state, s) => updateIn(state, ['servers'],
				svrs => conj(svrs, s)),
			cohort: (state, c) => assoc(state, 'cohort', c),
			foo: (state, val) => assoc(state, 'foo', val)
		};

		var getController = () => {
			var {controller: fetchController} =
					query(fetchMethods, dataRequests, cachePolicy, mount),
				controller = compose(fetchController, makeControls(controls)),
				store = createStore();
			return {controller, store};
		};
		var state = {servers: ['A', 'B']};

		stepper({queue, state, getController, assertState, done, actions: [
			[ui, ['foo', 'bar']], {foo: 'bar', servers: ['A', 'B']},
			[ui, ['foo', 'baz']], {foo: 'baz', servers: ['A', 'B']},
			[ui, ['cohort', 'smith']],
				{foo: 'baz', cohort: 'smith', servers: ['A', 'B']},
			[server, 0, [1, 2, 3, 4, 5, 6]],
				{foo: 'baz', cohort: 'smith', servers: ['A', 'B'],
					tester: {samples: {smith: [1, 2, 3, 4, 5, 6]}}},
			[reload], {foo: 'baz', cohort: 'smith', servers: ['A', 'B'],
					tester: {samples: {smith: [1, 2, 3, 4, 5, 6]}}},
			[ui, ['addServer', 'C']],
				{foo: 'baz', cohort: 'smith', servers: ['A', 'B', 'C'],
					tester: {samples: {smith: [1, 2, 3, 4, 5, 6]}}},
			[server, 1, [1, 2, 3, 4, 5, 6, 7, 8, 9]],
				{foo: 'baz', cohort: 'smith', servers: ['A', 'B', 'C'],
					tester: {samples: {smith: [1, 2, 3, 4, 5, 6, 7, 8, 9]}}},
			[finish]
		]});
	});
	it('should fetch after page load before query completes', function (done) {
		var mount = 'tester';
		var assertState = assertStateMount(mount);
		var queue = getQueue();
		var fetchMethods = {
			samples: (/*cohort, servers*/) => queue.queue()
		};
		var cachePolicy = {
			samples: identity
		};
		var dataRequests = state => [
			...(state.cohort ? [['samples', state.cohort, ['servers']]] : [])
		];
		var controls = {
			addServer: (state, s) => updateIn(state, ['servers'],
				svrs => conj(svrs, s)),
			cohort: (state, c) => assoc(state, 'cohort', c),
			foo: (state, val) => assoc(state, 'foo', val)
		};

		var getController = () => {
			var {controller: fetchController} =
					query(fetchMethods, dataRequests, cachePolicy, mount),
				controller = compose(fetchController, makeControls(controls)),
				store = createStore();
			return {controller, store};
		};
		var state = {servers: ['A', 'B']};

		stepper({queue, state, getController, assertState, done, actions: [
			[ui, ['foo', 'bar']], {foo: 'bar', servers: ['A', 'B']},
			[ui, ['foo', 'baz']], {foo: 'baz', servers: ['A', 'B']},
			[ui, ['cohort', 'smith']],
				{foo: 'baz', cohort: 'smith', servers: ['A', 'B']},
			[server, 0, [1, 2, 3, 4, 5, 6]],
				{foo: 'baz', cohort: 'smith', servers: ['A', 'B'],
					tester: {samples: {smith: [1, 2, 3, 4, 5, 6]}}},
			[reload], {foo: 'baz', cohort: 'smith', servers: ['A', 'B'],
					tester: {samples: {smith: [1, 2, 3, 4, 5, 6]}}},
			[ui, ['addServer', 'C']],
				{foo: 'baz', cohort: 'smith', servers: ['A', 'B', 'C'],
					tester: {samples: {smith: [1, 2, 3, 4, 5, 6]}}},
			[reload],
				{foo: 'baz', cohort: 'smith', servers: ['A', 'B', 'C'],
					tester: {samples: {smith: [1, 2, 3, 4, 5, 6]}}},
			// XXX have to issue action to initialize the reducers.
			// We already do this with 'init' action in the app, too. Not great,
			// but basically works.
			[ui, ['init']],
				{foo: 'baz', cohort: 'smith', servers: ['A', 'B', 'C'],
					tester: {samples: {smith: [1, 2, 3, 4, 5, 6]}}},
			[server, 2, [1, 2, 3, 4, 5, 6, 7, 8, 9]],
				{foo: 'baz', cohort: 'smith', servers: ['A', 'B', 'C'],
					tester: {samples: {smith: [1, 2, 3, 4, 5, 6, 7, 8, 9]}}},
			[finish]
		]});
	});
});
