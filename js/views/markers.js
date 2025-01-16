var {extend, map} = require('../underscore_ext').default;
import {Button, Dialog, DialogActions, DialogContent,
	DialogTitle} from '@material-ui/core';
import {el} from '../chart/react-hyper';
import {tableLayout} from './muiTable';

var button = el(Button);
var dialog = el(Dialog);
var dialogActions = el(DialogActions);
var dialogContent = el(DialogContent);
var dialogTitle = el(DialogTitle);

import styles from './markers.module.css';

function download(markers) {
	var txt = map(markers, (genes, cluster) => [cluster, genes.join(', ')].join('\t'))
		.join('\n');
	// use blob for bug in chrome: https://code.google.com/p/chromium/issues/detail?id=373182
	var url = URL.createObjectURL(new Blob([txt], { type: 'text/tsv' }));
	var a = document.createElement('a');
	var filename = 'marker_genes.tsv';
	extend(a, {id: filename, download: filename, href: url});
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
}

export default (onClick, {markers, label}) =>
	dialog({open: true, fullWidth: true, maxWidth: 'md', className: styles.dialog},
		dialogTitle(`Marker Genes for ${label}`),
		dialogContent(tableLayout({className: styles.table},
			['Cluster', 'Marker Genes'],
			map(markers, (genes, cluster) => [cluster, genes.join(', ')]))),
		dialogActions(button({onClick: () => download(markers)}, 'Download'),
			button({onClick}, 'Close')));
