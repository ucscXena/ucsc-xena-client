'use strict';
require('./base');

// import controller for the transcript view actions
var controller = require('./controllers/transcripts');
const connector = require('./connector');
const createStore = require('./store');
import '../css/index.css'; // Root styles file (reset, fonts, globals)
require('bootstrap/dist/css/bootstrap.css');
const Transcripts = require('./transcript_views/TranscriptPage');
var isPublicSelector = require('./isPublicSelector');

var setPublic = state => ({...state, isPublic: isPublicSelector(state)});

var store = createStore();
var main = window.document.getElementById('main');

var selector = state => setPublic(state);

// Start the application
connector({...store, controller, main, selector, Page: Transcripts, persist: true, history: false});
