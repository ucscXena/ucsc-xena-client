'use strict';
import {Menu, MenuItem, MenuDivider} from 'react-toolbox/lib/menu';
import {Button} from 'react-toolbox/lib/button';
import Link from 'react-toolbox/lib/link';
import Tooltip from 'react-toolbox/lib/tooltip';
var React = require('react');
//var config = require('../config');
var _ = require('../underscore_ext');
var Rx = require('../rx');
var {createBookmark} = require('../bookmark');
var classNames = require('classnames');

var compStyles = require('./BookmarkMenu.module.css');

// XXX This is a horrible work-around for react-toolbox menu limitations.
// We want the Bookmark MenuItem to not close the menu. Menu closes when
// a MenuItem is clicked by intercepting the onClick handler. However, it
// only intercepts onClick handlers of MenuItem children. By simply wrapping
// MenuItem, we avoid this.
class NoCloseMenuItem extends React.Component {
	render() {
		var {tooltip, ...otherProps} = this.props;
		return <MenuItem {...otherProps}/>;
	}
}

var TooltipNoCloseMenuItem = Tooltip(NoCloseMenuItem);

var privateWarning = 'Unable to create bookmark link due to private data in view. Use export instead';

class BookmarkMenu extends React.Component {
	state = {loading: false, open: false};

	onBookmark = () => {
		var {getState} = this.props;
		this.setState({loading: true});
		Rx.Observable.ajax({
			method: 'POST',
			url: '/api/bookmarks/bookmark',
			responseType: 'text',
			headers: {
				'X-CSRFToken': document.cookie.replace(/.*csrftoken=([0-9a-z]+)/, '$1'),
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: `content=${encodeURIComponent(createBookmark(getState()))}`
		}).subscribe(this.onSetBookmark, () => this.setState({loading: false}));
	};

	onSetBookmark = (resp) => {
		var {id} = JSON.parse(resp.response);
		this.setState({bookmark: `${location.href}?bookmark=${id}`, loading: false});
	};

	onResetBookmark = () => {
		this.setState({bookmark: null});
	};

	onCopyBookmarkToClipboard = () => {
		this.bookmarkEl.select();
		document.execCommand('copy');
	};

	onExport = () => {
		var {getState} = this.props;
		var url = URL.createObjectURL(new Blob([JSON.stringify(getState())], { type: 'application/json' }));
		var a = document.createElement('a');
		var filename = 'xenaState.json';
		_.extend(a, { id: filename, download: filename, href: url });
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
	};

	onImport = () => {
		this.refs.import.click();
	};

	onImportSelected = (ev) => {
		var file = ev.target.files[0],
			reader = new FileReader(),
			{onImport} = this.props;

		reader.onload = () => onImport(reader.result);
		reader.readAsText(file);
		ev.target.value = null;
	};

	resetBookmark = () => {
		this.setState({bookmark: null});
	};

	onClick = () => {
		this.setState({open: !this.state.open});
	};

	handleMenuHide = () => {
		this.setState({open: false});
		if (this.props.onHide) {
			this.props.onHide();
		}
	};

	render() {
		var {bookmark, loading, open} = this.state,
			{isPublic} = this.props,
			BookmarkElement = isPublic ? NoCloseMenuItem : TooltipNoCloseMenuItem;

		// min-width specified on first MenuItem of bookmark menu is a hack to
		// force menu items to extend full width for both no bookmark and
		// bookmark states. RTB positions and clips the menu content according
		// to the initial menu item content which causes problems when we move
		// from the "Your Bookmark is Loading" to "Copy to Clipboard" states.
		// Do not remove this inline style!
		//
		// In similar fashion, it's important to render a placeholder for the
		// eventual 'Copy' item. Otherwise it will be clipped, because Menu
		// does not re-compute clipping when children change.
		return (
			<div style={{display: 'inline', position: 'relative'}}>
				<Button onClick={this.onClick}>Bookmark</Button>
				<Menu position='auto' active={open} onHide={this.handleMenuHide} className={compStyles.iconBookmark} iconRipple={false} onShow={this.resetBookmark}>
					<BookmarkElement
						tooltip={privateWarning}
						style={{minWidth: 218, pointerEvents: 'all' /* override MenuItem 'disabled' class */}}
						disabled={!isPublic}
						onClick={this.onBookmark}
						caption='Bookmark'/>
					<MenuItem onClick={this.onExport} title={null} caption='Export'/>
					<MenuItem onClick={this.onImport} title={null} caption='Import'/>
					<Link className={compStyles.help} target='_blank' href='http://xena.ucsc.edu/bookmarks/' label='Help'/>
					<MenuDivider/>
					<MenuItem
						onClick={bookmark ? this.onCopyBookmarkToClipboard : undefined}
						caption={bookmark ? 'Copy Bookmark' : 'Your Bookmark is Loading'}
						disabled={!bookmark}
						className={bookmark || loading ? '' : compStyles.placeholder}/>
					<p className={classNames(compStyles.warning, bookmark ? '' : compStyles.placeholder)}>
						Note: bookmarks are only guaranteed for 3 months after creation
					</p>
					<input className={compStyles.bookmarkInput} ref={(input) => this.bookmarkEl = input} value={bookmark || ''}/>
					<input className={compStyles.importInput} ref='import' id='import' onChange={this.onImportSelected} type='file'/>
				</Menu>
			</div>);
	}
}

module.exports = BookmarkMenu;
