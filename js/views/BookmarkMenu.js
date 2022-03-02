import {getColumns} from '../columnsParam';
import {getHeatmap} from '../heatmapParam';
import {Box, Button, Divider, Link, Menu, MenuItem, Tooltip, Typography} from '@material-ui/core';
var React = require('react');
var _ = require('../underscore_ext').default;
var Rx = require('../rx').default;
var {createBookmark, getRecent, setRecent} = require('../bookmark');
var gaEvents = require('../gaEvents');
import {hidden} from '../nav';
import {xenaColor} from '../xenaColor';

// Styles
var compStyles = require('./BookmarkMenu.module.css');
var sxHelpLink = {
	display: 'flex',
	justifyContent: 'flex-end',
	padding: '0 16px',
	textTransform: 'uppercase',
};
var sxMenuLink = {
	alignItems: 'center',
	height: 48,
	padding: '0 16px'
};
var sxWarning = {
	color: `${xenaColor.PRIMARY_CONTRAST} !important`,
	padding: '0 16px',
	maxWidth: 220,
};

var privateWarning = 'Unable to create bookmark link due to private data in view. Use export instead.';

var linking; // XXX move to state?

class BookmarkMenu extends React.Component {
	state = {anchorEl: null, loading: false, open: false, recent: false};

	UNSAFE_componentWillMount() {//eslint-disable-line camelcase
		linking = hidden.create('linking', 'Links in Bookmarks', {
			onChange: val => linking = val,
			default: false
		});
	}

	componentWillUnmount() {
		hidden.delete('linking');
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

	onCopyBookmarkToClipboard = () => {
		this.bookmarkEl.select();
		document.execCommand('copy');
		this.handleMenuHide();
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
		this.handleMenuHide();
	};

	onImport = () => {
		this.refs.import.click();
		this.handleMenuHide();
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

	onClick = (event) => {
		this.setState({anchorEl: event.currentTarget, open: true, recent: false});
	};

	onRecent = () => {
		this.setState({bookmark: null, open: false, recent: true});
	};

	onRecentHide = () => {
		this.setState({anchorEl: null, recent: false});
	};

	handleMenuHide = () => {
		this.setState({anchorEl: null, bookmark: null, open: false, recent: false});
		if (this.props.onHide) {
			this.props.onHide();
		}
	};

	onViewBookmark(id) {
		window.location = window.location.href + `?bookmark=${id}`;
		this.handleMenuHide();
	}

	render() {
		var {anchorEl, bookmark, loading, open, recent} = this.state,
			{isPublic, getState} = this.props,
			recentBookmarks = getRecent();

		return (
			<>
				<Button onClick={this.onClick}>Bookmark</Button>
				<Menu
					anchorEl={anchorEl}
					anchorOrigin={{horizontal: 'left', vertical: 'bottom'}}
					getContentAnchorEl={null}
					keepMounted /* required; prevents duplication of styles 'counter' for Mui Box components in nav. */
					onClose={this.handleMenuHide}
					open={open}>
					{isPublic ? <MenuItem onClick={this.onBookmark}>Bookmark</MenuItem> :
						<Tooltip title={privateWarning}>
							<MenuItem
								disabled
								style={{pointerEvents: 'all' /* override MenuItem 'disabled' class */}}
							>Bookmark</MenuItem>
						</Tooltip>}
					{recentBookmarks.length > (bookmark ? 1 : 0) &&
					<MenuItem onClick={this.onRecent}>Recent bookmarks</MenuItem>}
					<MenuItem onClick={this.onExport}>Export</MenuItem>
					<MenuItem onClick={this.onImport}>Import</MenuItem>
					<Box
						component={Link}
						href={`${location.href.replace(/heatmap.*/, 'heatmap')}heatmap/?columns=${getColumns(getState())}&heatmap=${getHeatmap(getState())}`}
						onClick={this.handleMenuHide}
						sx={{...sxMenuLink, display: linking ? 'flex' : 'none'}}
						target='_blank'>Link</Box>
					<Box
						component={Link}
						href='https://ucsc-xena.gitbook.io/project/overview-of-features/bookmarks'
						sx={sxHelpLink}
						target='_blank'
						variant='body1'>Help</Box>
					{(bookmark || loading) && <Divider/>}
					{(bookmark || loading) &&
					<MenuItem
						onClick={bookmark ? this.onCopyBookmarkToClipboard : undefined}
						disabled={!bookmark}>
						{bookmark ? 'Copy Bookmark' : 'Your Bookmark is Loading'}
					</MenuItem>}
					<Box
						component={Typography}
						sx={{...sxWarning, display: bookmark ? 'block' : 'none'}}
						variant='caption'>Note: bookmarks are only guaranteed for 3 months after creation</Box>
					<input className={compStyles.bookmarkInput} readOnly={true} ref={(input) => this.bookmarkEl = input} value={bookmark || ''}/>
					<input className={compStyles.importInput} ref='import' id='import' onChange={this.onImportSelected} type='file'/>
				</Menu>
				<Menu
					anchorEl={anchorEl}
					anchorOrigin={{horizontal: 'left', vertical: 'bottom'}}
					getContentAnchorEl={null}
					onClose={this.onRecentHide}
					open={recent && recentBookmarks.length > 0}>
					{recentBookmarks.map(({id, time}) => (
						<MenuItem key={id} onClick={() => this.onViewBookmark(id)}>
							{`${time.replace(/ GMT.*/, '')} (${id.slice(0, 4)})`}
						</MenuItem>
					))}
				</Menu>
			</>);
	}
}

module.exports = BookmarkMenu;
