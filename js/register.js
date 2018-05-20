'use strict';

// disable analytics

if (window.localStorage) {
	window.localStorage.noga = 'true';
}


const main = window.document.getElementById('main');
main.innerHTML = "Registered";
