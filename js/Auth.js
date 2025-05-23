import {Button, Dialog, DialogActions, DialogContent, Link}
	from '@material-ui/core';

import Error from '@material-ui/icons/Error';

import {el, br, span} from './chart/react-hyper';

import {hidden} from './nav';

var button = el(Button);
var dialog = el(Dialog);
var dialogActions = el(DialogActions);
var dialogContent = el(DialogContent);
var link = el(Link);
var errorIcon = el(Error);

var errorStyle = {
	color: 'red',
	fontSize: '110%',
	position: 'relative',
	top: 2
};

var page = () => location.pathname + location.search;

// stash the current page in the oauth state param so we can
// restore it after redirect
var addPage = link => {
	var url = new URL(link),
		state = url.searchParams.get('state');
	url.searchParams.set('state', page() + '@' + state);
	return url.href;
};

var showCancel;
var setCancel = next => showCancel = next;
showCancel = hidden.create('authcancel', 'Auth cancel button', {onChange: setCancel});

export default (host, url, onClick, error) =>
	dialog({open: true}, dialogContent(
		...(error ? [span(errorIcon({style: errorStyle}), error, br())] : []),
		`Authentication required for ${host}`, br(),
			link({href: addPage(url)}, 'Log in with Google')),
		...(showCancel ?
			[dialogActions(button({onClick: () => onClick(host)}, 'Cancel'))] : []));
