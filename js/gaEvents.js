/*global ga: false */

import config from './config';

var dispatch = (window.ga && config.ga_id) ?
	(...args) => window.ga('send', 'event', ...args) :
	(...args) => console.log('event', ...args);

export default dispatch;
