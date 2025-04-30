import './base';
import * as _ from './underscore_ext.js';
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
import authController from './controllers/auth';
import PageContainer from './containers/PageContainer';
import { compose } from './controllers/utils';
import connectionController from './controllers/connection';
import { initialState } from './initialState.js';

import connector from './connector'; // see webpack alias for this import
import createStore from './store.js';
import * as xenaWasm from './xenaWasm.js';

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
		import('./controllers/ui').then(newModule => {
			_.extend(uiController, newModule.default);
		});
	});
	module.hot.accept('./controllers/server', () => {
		import('./controllers/server').then(newModule => {
			_.extend(serverController, newModule.default);
		});
	});
	module.hot.accept('./controllers/hub', () => {
		import('./controllers/hub').then(newModule => {
			_.extend(hubController, newModule.default);
		});
	});
	module.hot.accept('./controllers/wizard', () => {
		import('./controllers/wizard').then(newModule => {
			_.extend(wizardController, newModule.default);
		});
	});
	module.hot.accept('./controllers/singlecell', () => {
		import('./controllers/singlecell').then(newModule => {
			_.extend(singlecellController, newModule.default);
		});
	});
	module.hot.accept('./controllers/transcripts', () => {
		import('./controllers/transcripts').then(newModule => {
			_.extend(transcriptController, newModule.default);
		});
	});
	module.hot.accept('./controllers/import', () => {
		import('./controllers/import').then(newModule => {
			_.extend(importController, newModule.default);
		});
	});
	// XXX Note that hot-loading these won't cause a re-render.
	module.hot.accept('./models/mutationVector', () => {});
	module.hot.accept('./models/denseMatrix', () => {});
	module.hot.accept('./models/segmented', () => {});
}

const store = createStore();
const main = window.document.getElementById('main');

// controllers run in the opposite order as listed in compose().
const controller = compose(connectionController(store.uiBus), authController, hubController, serverController, wizardController, singlecellController, uiController, transcriptController, importController);

xenaWasm.loaded.then(() => {
	connector({...store, initialState, controller, main, Page: PageContainer,
		persist: true, history: false});
});
