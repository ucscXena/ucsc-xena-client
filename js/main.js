'use strict';

require('./base');
var _ = require('./underscore_ext');
require('./plotDenseMatrix');
require('./plotMutationVector');
require('./plotSegmented');
require('./plotSamples');
require('./refGeneExons');
require('./ChromPosition');
require('./models/denseMatrix');
require('./models/mutationVector');
require('./models/segmented');
var uiController = require('./controllers/ui');
var serverController = require('./controllers/server');
var hubController = require('./controllers/hub');
var transcriptController = require('./controllers/transcripts');
require('bootstrap/dist/css/bootstrap.css');
//var Application = require('./containers/ApplicationContainer');
var PageContainer = require('./containers/PageContainer');
var selector = require('./appSelector');
var {compose} = require('./controllers/utils');
var shimComposite = require('./controllers/shimComposite').controller;
const connector = require('./connector');
const createStore = require('./store');

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
		var newModule = require('./controllers/ui');
		_.extend(uiController, newModule);
	});
	module.hot.accept('./controllers/server', () => {
		var newModule = require('./controllers/server');
		_.extend(serverController, newModule);
	});
	module.hot.accept('./controllers/hub', () => {
		var newModule = require('./controllers/hub');
		_.extend(hubController, newModule);
	});
	// XXX Note that hot-loading these won't cause a re-render.
	module.hot.accept('./models/mutationVector', () => {});
	module.hot.accept('./models/denseMatrix', () => {});
	module.hot.accept('./models/segmented', () => {});
}

var store = createStore();
var main = window.document.getElementById('main');

// XXX reducer
var controller = shimComposite(compose(serverController, uiController, hubController, transcriptController));

connector({...store, controller, main, selector, Page: PageContainer, persist: true, history: false});
