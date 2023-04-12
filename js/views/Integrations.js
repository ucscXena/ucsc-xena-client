var {isArray} = require('../underscore_ext').default;

import styles from './Integrations.module.css';

import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableRow from '@material-ui/core/TableRow';
import TableHead from '@material-ui/core/TableHead';
import Paper from '@material-ui/core/Paper';
import {el, p} from '../chart/react-hyper';

var table = el(Table);
var tb = el(TableBody);
var tc = el(TableCell);
var tr = el(TableRow);
var th = el(TableHead);
var tableContainer = el(TableContainer);

var exp = child => isArray(child) ? child : [child];

var trCells = (props, cells) => tr(props, ...cells.map(cell => tc(...exp(cell))));
var tableLayout = (header, rows) =>
	tableContainer({component: Paper, className: styles.table},
		table(th(header), tb(...rows.map(row => trCells(...row)))));

var headers = ['Name', 'Donors', 'Cells/Spots', 'Data types'];

export default ({list}) =>
	tableLayout(
		trCells({}, headers),
		list.map(({onClick, highlight, label, donors, cells, assays}, i) =>
			[{onClick, 'data-row': i, className: highlight ? styles.selected : ''},
				[label, donors.map(d => p(d)),
					cells.map(c => p(c)), assays.map(a => p(a))]]));

