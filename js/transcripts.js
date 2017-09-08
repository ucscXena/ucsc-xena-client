'use strict';
require('./base');

// import controller for the transcript view actions
var controller = require('./controllers/transcripts');
const connector = require('./connector');
const createStore = require('./store');
require('bootstrap/dist/css/bootstrap.css');
const Transcripts = require('./transcript_views/TranscriptPage');

var store = createStore();
var main = window.document.getElementById('main');

var selector = state => state; // currently unused by Transcripts

// Start the application
connector({...store, controller, main, selector, Page: Transcripts, persist: true, history: false});
