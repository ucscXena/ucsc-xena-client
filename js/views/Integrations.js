var {identity, isArray, isObject, Let, merge, updateIn} = require('../underscore_ext').default;

import styles from './Integrations.module.css';

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
var tableLayout = (header, rows) =>
	tableContainer({component: Paper, className: styles.table},
		table(th(trCells(...header)), tb(...rows.map(row => trCells(...row)))));

var headers = ['Name', 'Donors', 'Cells/Spots', 'Data types'];

var number = n => [{className: styles.number}, n.toString()];

var cohortRow = ({donors, cells, assays}) => [number(donors), number(cells), assays];

var studyProp = isStudy => ({className: isStudy ? styles.study : styles.sub});
var labelRow = label => label && [studyProp(true), label, '', '', ''];

// remove falsy elements
var ident = a => a.filter(e => e);

var addSelected = props => updateIn(props, ['className'],
	cn => ident([cn, styles.selected]).join(' '));

var setHighlight = (highlight, onClick, i) =>
	Let((addSel = highlight === i ? addSelected : identity) =>
		row => updateIn(row, [0], props =>
			merge(addSel(props),
				{onClick: ev => onClick(ev, i), onDoubleClick: ev => onClick(ev, i)})));

var studyRows = (highlight, onClick) => ({label, studies}, i) => ident([
	labelRow(label),
	...studies.map(({label: l2, cohorts: [first, ...rest]}) =>
		[[studyProp(!label),
			[{rowSpan: rest.length + 1}, l2], ...cohortRow(first)],
		 ...rest.map(c => [{}, ...cohortRow(c)])]).flat()
]).map(setHighlight(highlight, onClick, i));

export default ({list, onHighlight: onClick, highlight}) =>
	tableLayout(
		headers,
		list.map(studyRows(highlight, onClick)).flat());
