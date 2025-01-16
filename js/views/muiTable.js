var {isArray, isObject, merge} = require('../underscore_ext').default;
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableRow from '@material-ui/core/TableRow';
import TableHead from '@material-ui/core/TableHead';
import Paper from '@material-ui/core/Paper';
import {el} from '../chart/react-hyper';

var table = el(Table);
var tb = el(TableBody);
var tc = el(TableCell);
var tr = el(TableRow);
var th = el(TableHead);
var tableContainer = el(TableContainer);

// table cell. Expand arguments if necessary.
var tcExp = arg => isArray(arg) ? tc(...arg) : tc(arg);

var isProp = arg => isObject(arg) && !isArray(arg);

// table row. Wrap contents in table cells. First element can be
// props or content.
var trCells = (poc, ...cells) =>
	tr(isProp(poc) ? poc : tcExp(poc), ...cells.map(cell => tcExp(cell)));

// layout table, given header and rows
export var tableLayoutOpts = (opts, header, rows) =>
	tableContainer(merge({component: Paper}, opts),
		table(th(trCells(...header)), tb(...rows.map(row => trCells(...row)))));

export var tableLayout = (...args) =>
	args.length === 2 ? tableLayoutOpts({}, ...args) : tableLayoutOpts(...args);
