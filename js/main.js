import './base';
var _ = require('./underscore_ext').default;
import './plotDenseMatrix';
import './plotMutationVector';
import './plotSegmented';
import './plotSamples';
import './ChromPosition';
import './models/denseMatrix';
import './models/mutationVector';
import './models/segmented';

import uiController from './controllers/ui';
import serverController from './controllers/server';
import hubController from './controllers/hub';
import wizardController from './controllers/wizard';
import singlecellController from './controllers/singlecell';
import transcriptController from './controllers/transcripts';
import importController from './controllers/import';
//import tiesController from './controllers/ties';
import PageContainer from './containers/PageContainer';
import { compose } from './controllers/utils';
import connectionController from './controllers/connection';
var {initialState} = require('./initialState');

const connector = require('./connector');
const createStore = require('./store');
const xenaWasm = require('./xenaWasm');

// Hot load controllers. Note that hot loading won't work if one of the methods
// is captured in a closure or variable which we can't access.  References to
// the controller methods should only happen by dereferencing the module. That's
// currently true of the controllers/compose method, so we are able to hot
// load by overwritting the methods, here. However it's not true of devtools.
// If we had a single controller (i.e. no call to compose), passing a single
// controller to devtools would defeat the hot loading. Sol'n would be to
// update devtools to always dereference the controller, rather than keeping
// methods in closures.
// Rx streams in components are also a problem.

if (module.hot) {
	module.hot.accept('./controllers/ui', () => {
		let newModule = require('./controllers/ui').default;
		_.extend(uiController, newModule);
	});
	module.hot.accept('./controllers/server', () => {
		let newModule = require('./controllers/server').default;
		_.extend(serverController, newModule);
	});
	module.hot.accept('./controllers/hub', () => {
		let newModule = require('./controllers/hub').default;
		_.extend(hubController, newModule);
	});
	module.hot.accept('./controllers/wizard', () => {
		let newModule = require('./controllers/wizard').default;
		_.extend(wizardController, newModule);
	});
	module.hot.accept('./controllers/singlecell', () => {
		let newModule = require('./controllers/singlecell').default;
		_.extend(singlecellController, newModule);
	});
	module.hot.accept('./controllers/transcripts', () => {
		let newModule = require('./controllers/transcripts').default;
		_.extend(transcriptController, newModule);
	});
	module.hot.accept('./controllers/import', () => {
		let newModule = require('./controllers/import').default;
		_.extend(importController, newModule);
	});
//	module.hot.accept('./controllers/ties', () => {
//		let newModule = require('./controllers/ties');
//		_.extend(tiesController, newModule);
//	});
	// XXX Note that hot-loading these won't cause a re-render.
	module.hot.accept('./models/mutationVector', () => {});
	module.hot.accept('./models/denseMatrix', () => {});
	module.hot.accept('./models/segmented', () => {});
}

const store = createStore();
const main = window.document.getElementById('main');

// controllers run in the opposite order as listed in compose().
const controller = compose(connectionController(store.uiBus), hubController, serverController, wizardController, singlecellController, uiController, transcriptController, importController/*, tiesController*/);

xenaWasm.loaded.then(() => {
	connector({...store, initialState, controller, main, Page: PageContainer, persist: true, history: false});
});
