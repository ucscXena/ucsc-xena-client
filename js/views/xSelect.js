import {InputLabel, Select} from '@material-ui/core';
import XFormControl from '../views/XFormControl';
import {el} from '../chart/react-hyper';
var select = el(Select);
var xFormControl = el(XFormControl);
var inputLabel = el(InputLabel);

export default ({label, id, ...props}, ...children) =>
	xFormControl(
		label && inputLabel({id}, label),
		select({labelId: label && id, variant: 'standard', ...props}, ...children));
