'use strict';
var React = require('react');
require('./ColumnInlineEditor.css');

// The point here is to render the column and editor in
// two divs to allow a 'flip' animation. The editor
// would be unmounted in a parent component after a timeout.
module.exports = props => (
	<div actionKey={props.actionKey} className={props.show === 'editor' ? 'flip-container flip' : 'flip-container'}>
		<div className='flipper'>
			<div className='front'>{props.column}</div>
			<div className='back'>{props.editor}</div>
		</div>
	</div>);
