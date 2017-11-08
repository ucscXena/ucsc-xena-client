'use strict';
import {Menu, MenuItem, MenuDivider} from 'react-toolbox/lib/menu';
import {Button} from 'react-toolbox/lib/button';
import Tooltip from 'react-toolbox/lib/tooltip';
var React = require('react');
//var config = require('../config');
var _ = require('../underscore_ext');
var Rx = require('../rx');
var {createBookmark} = require('../bookmark');
var konami = require('../konami');

var compStyles = require('./BookmarkMenu.module.css');

var bookmarksDefault = false;
if (process.env.NODE_ENV !== 'production') {
	bookmarksDefault = true;
}

var asciiA = 65;

// XXX This is a horrible work-around for react-toolbox menu limitations.
// We want the Bookmark MenuItem to not close the menu. Menu closes when
// a MenuItem is clicked by intercepting the onClick handler. However, it
// only intercepts onClick handlers of MenuItem children. By simply wrapping
// MenuItem, we avoid this.
var NoCloseMenuItem = React.createClass({
	render() {
		return <MenuItem {...this.props}/>;
	}
});

var TooltipNoCloseMenuItem = Tooltip(NoCloseMenuItem);

var privateWarning = 'Unable to create bookmark link due to private data in view. Use export instead';

var BookmarkMenu = React.createClass({
	getInitialState() {
		return {loading: false, bookmarks: bookmarksDefault, open: false};
	},
	componentWillMount() {
		this.ksub = konami(asciiA).subscribe(this.enableBookmarks);
	},
	componentWillUnmount() {
		this.ksub.unsubscribe();
	},
	enableBookmarks() {
		this.setState({bookmarks: true});
	},
	onBookmark() {
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
	},
	onSetBookmark(resp) {
		var {id} = JSON.parse(resp.response);
		this.setState({bookmark: `${location.href}?bookmark=${id}`, loading: false});
	},
	onResetBookmark() {
		this.setState({bookmark: null});
	},
	onCopyBookmarkToClipboard() {
		this.bookmarkEl.select();
		document.execCommand('copy');
	},
	onExport() {
		var {getState} = this.props;
		var url = URL.createObjectURL(new Blob([JSON.stringify(getState())], { type: 'application/json' }));
		var a = document.createElement('a');
		var filename = 'xenaState.json';
		_.extend(a, { id: filename, download: filename, href: url });
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
	},
	onImport() {
		this.refs.import.click();
	},
	onImportSelected(ev) {
		var file = ev.target.files[0],
			reader = new FileReader(),
			{onImport} = this.props;

		reader.onload = () => onImport(JSON.parse(reader.result));
		reader.readAsText(file);
		ev.target.value = null;
	},
	resetBookmark() {
		this.setState({bookmark: null});
	},
	onClick() {
		this.setState({open: !this.state.open});
	},
	handleMenuHide() {
		this.setState({open: false});
		if (this.props.onHide) {
			this.props.onHide();
		}
	},
	render() {
		var {bookmarks, bookmark, loading, open} = this.state,
			{isPublic} = this.props,
			BookmarkElement = isPublic ? NoCloseMenuItem : TooltipNoCloseMenuItem;

		if (!bookmarks) {
			return null;
		}
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
						style={{minWidth: 218}}
						disabled={!isPublic}
						onClick={this.onBookmark}
						caption='Bookmark'/>
					<MenuItem onClick={this.onExport} title={null} caption='Export'/>
					<MenuItem onClick={this.onImport} title={null} caption='Import'/>
					<MenuDivider/>
					{bookmark ? <MenuItem onClick={this.onCopyBookmarkToClipboard} caption='Copy Bookmark'/> : null}
					{loading ? <MenuItem disabled={true} caption='Your Bookmark is Loading'/> : null}
					{!bookmark && !loading ? <MenuItem className={compStyles.placeholder} disabled={true}>Placeholder</MenuItem> : null}
					<input className={compStyles.bookmarkInput} ref={(input) => this.bookmarkEl = input} value={bookmark}/>
					<input className={compStyles.importInput} ref='import' id='import' onChange={this.onImportSelected} type='file'/>
				</Menu>
			</div>);
	}
});

module.exports = BookmarkMenu;
