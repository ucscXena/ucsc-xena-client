import {Button, Dialog, DialogActions, DialogContent,
	DialogTitle} from '@material-ui/core';
import {el, span} from '../chart/react-hyper';
import {tableLayout} from './muiTable';
import {colorScale, categoryMore as colors} from '../colorScales';
var {assoc, Let, range} = require('../underscore_ext').default;
import {cmp} from './singlecellLegend';

var button = el(Button);
var dialog = el(Dialog);
var dialogActions = el(DialogActions);
var dialogContent = el(DialogContent);
var dialogTitle = el(DialogTitle);

import styles from './colorPicker.module.css';

var onCellClick = ({customColor, onClick}) => ev => {
	if (ev.target.tagName === 'SPAN') {
		var cat = ev.target.parentElement.parentElement.dataset.code;
		var color = ev.target.parentElement.cellIndex - 1;
		onClick(assoc(customColor, cat, colors[color]));
	}
};

var colorTable = ({customColor, onClick, codes, scale}) =>
  tableLayout({className: styles.table, onClick: onCellClick({customColor, onClick})},
              ['Category', ...colors.map(c => span({style: {backgroundColor: c}}))],
              range(codes.length).sort(cmp(codes)).reverse().map(
                i => [{'data-code': i}, codes[i], ...colors.map(c =>
                  span({style: {backgroundColor:
                    scale(i) === c ? c : 'rgba(0, 0, 0, 0)'}}, ''))]));

export default ({onClick, onClose, data}) =>
  Let((scale = colorScale(data.scale), [, , customColor] = data.scale) =>
    dialog({open: true, fullWidth: true, maxWidth: 'md', className: styles.dialog},
           dialogTitle('Edit colors'),
      dialogContent(colorTable({customColor, onClick, codes: data.codes, scale})),
      dialogActions(button({onClick: onClose}, 'Close'))));
