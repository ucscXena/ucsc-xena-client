var {map} = require('../underscore_ext').default;
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

export default (onClick, {markers, label}) =>
	dialog({open: true, fullWidth: true, maxWidth: 'md', className: styles.dialog},
		dialogTitle(`Marker Genes for ${label}`),
		dialogContent(tableLayout({className: styles.table},
			['Cluster', 'Marker Genes'],
			map(markers, (genes, cluster) => [cluster, genes.join(', ')]))),
		dialogActions(button({onClick}, 'Close')));
