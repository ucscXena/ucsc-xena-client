'use strict';
import {Menu, MenuItem, MenuDivider} from 'react-toolbox/lib/menu';
import {Button} from 'react-toolbox/lib/button';
import Link from 'react-toolbox/lib/link';
import Tooltip from 'react-toolbox/lib/tooltip';
var React = require('react');
var _ = require('../underscore_ext');
var Rx = require('../rx');
var {createBookmark, getRecent, setRecent} = require('../bookmark');

var compStyles = require('./BookmarkMenu.module.css');
var gaEvents = require('../gaEvents');

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
	state = {loading: false, open: false, recent: false};

	// RTB positions and clips the menu content according
	// to the initial menu render size, which causes problems
	// for dynamic content. This is a work-around which causes
	// the Menu component to re-calculate its size every time
	// we update.
	componentDidUpdate() {
		if (this.state.open && this.menuRef) {
			this.menuRef.show();
		}
	}

	onRef = ref => {
		this.menuRef = ref;
	}

	onBookmark = () => {
		gaEvents('bookmark', 'create');
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
		setRecent(id);
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
		gaEvents('bookmark', 'export');
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
		gaEvents('bookmark', 'import');
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
		this.setState({open: !(this.state.open || this.state.recent), recent: false});
	};

	onRecent = () => {
		this.setState({recent: !this.state.recent, open: false});
	}

	onRecentHide = () => {
		this.setState({recent: false});
	}

	handleMenuHide = () => {
		this.setState({open: false});
		if (this.props.onHide) {
			this.props.onHide();
		}
	};

	onViewBookmark(id) {
		window.location = window.location.href + `?bookmark=${id}`;
	}

	render() {
		var {bookmark, loading, open, recent} = this.state,
			{isPublic} = this.props,
			recentBookmarks = getRecent(),
			BookmarkElement = isPublic ? NoCloseMenuItem : TooltipNoCloseMenuItem;

		return (
			<div style={{display: 'inline', position: 'relative'}}>
				<Button onClick={this.onClick}>Bookmark</Button>
				<Menu innerRef={this.onRef} position='topLeft' active={open} onHide={this.handleMenuHide} className={compStyles.iconBookmark} iconRipple={false} onShow={this.resetBookmark}>
					<BookmarkElement
						tooltip={privateWarning}
						style={{pointerEvents: 'all' /* override MenuItem 'disabled' class */}}
						disabled={!isPublic}
						onClick={this.onBookmark}
						caption='Bookmark'/>
					{recentBookmarks.length > (bookmark ? 1 : 0) ?
						<MenuItem onClick={this.onRecent} title={null} caption='Recent bookmarks'/> : null}
					<MenuItem onClick={this.onExport} title={null} caption='Export'/>
					<MenuItem onClick={this.onImport} title={null} caption='Import'/>
					<Link className={compStyles.help} target='_blank' href='https://ucsc-xena.gitbook.io/project/overview-of-features/bookmarks' label='Help'/>
					{bookmark || loading ? <MenuDivider/> : null}
					{bookmark || loading ? (
						<MenuItem
							onClick={bookmark ? this.onCopyBookmarkToClipboard : undefined}
							caption={bookmark ? 'Copy Bookmark' : 'Your Bookmark is Loading'}
							disabled={!bookmark}/>) : null}
					{bookmark ? (
						<p className={compStyles.warning}>
							Note: bookmarks are only guaranteed for 3 months after creation
						</p>) : null}
					<input className={compStyles.bookmarkInput} ref={(input) => this.bookmarkEl = input} value={bookmark || ''}/>
					<input className={compStyles.importInput} ref='import' id='import' onChange={this.onImportSelected} type='file'/>
				</Menu>
				<Menu onSelect={this.onViewBookmark}
						position='auto'
						active={recent && recentBookmarks.length > 0}
						className={compStyles.iconBookmark}
						iconRipple={false}
						onHide={this.onRecentHide}>
					{recentBookmarks.map(({id, time}) => (
						<MenuItem key={id} value={id} title={null} caption={`${time.replace(/ GMT.*/, '')} (${id.slice(0, 4)})`}/>
						))}
				</Menu>
			</div>);
	}
}

module.exports = BookmarkMenu;
