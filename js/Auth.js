import {Button, Dialog, DialogActions, DialogContent, Link}
	from '@material-ui/core';

import {Error} from '@material-ui/icons';

import {el, br} from './chart/react-hyper';

var button = el(Button);
var dialog = el(Dialog);
var dialogActions = el(DialogActions);
var dialogContent = el(DialogContent);
var link = el(Link);
var errorIcon = el(Error);

export default (host, url, onClick, error) =>
	dialog({open: true}, dialogContent(
		...(error ? [errorIcon(), error, br()] : []),
		`Auth required for ${host}`, br(),
			link({href: url}, 'Log in with Google')),
		dialogActions(button({onClick: () => onClick(host)}, 'Cancel')));
