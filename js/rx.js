'use strict';
var Rx = {
	Observable: require('rxjs/Observable').Observable,
	Subject: require('rxjs/Subject').Subject,
	Scheduler: Object.assign(
			{},
			require('rxjs/scheduler/async').async,
			require('rxjs/scheduler/asap'),
			require('rxjs/scheduler/animationFrame')),
	Subscription: require('rxjs/Subscription').Subscription

};

require('rxjs/add/observable/bindCallback');
require('rxjs/add/observable/defer');
require('rxjs/add/observable/dom/ajax');
require('rxjs/add/observable/fromEvent');
require('rxjs/add/observable/interval');
require('rxjs/add/observable/merge');
require('rxjs/add/observable/of');
require('rxjs/add/observable/throw');
require('rxjs/add/observable/zip');
require('rxjs/add/operator/catch');
require('rxjs/add/operator/concat');
require('rxjs/add/operator/debounceTime');
require('rxjs/add/operator/distinctUntilChanged');
require('rxjs/add/operator/delay');
require('rxjs/add/operator/do');
require('rxjs/add/operator/filter');
require('rxjs/add/operator/groupBy');
require('rxjs/add/operator/map');
require('rxjs/add/operator/merge');
require('rxjs/add/operator/mergeAll');
require('rxjs/add/operator/mergeMap');
require('rxjs/add/operator/sample');
require('rxjs/add/operator/scan');
require('rxjs/add/operator/share');
require('rxjs/add/operator/startWith');
require('rxjs/add/operator/switchMap');
require('rxjs/add/operator/take');
require('rxjs/add/operator/takeUntil');
require('rxjs/add/operator/throttleTime');
require('rxjs/add/operator/timeoutWith');
require('rxjs/add/operator/toArray');
require('rxjs/add/operator/windowCount');

require('./rx.ext');

module.exports = Rx;
