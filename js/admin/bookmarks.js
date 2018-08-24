'use strict';
import React, {Component} from 'react';
var ReactDOM = require('react-dom');
var Rx = require('../rx');
var main = window.document.getElementById('main');
var {allParameters} = require('../util');
var {sortBy} = require('../underscore_ext');

var compStyles = require('./bookmarks.module.css');

class Weekly extends Component {
	state = {weeks: null};
	componentWillMount() {
		Rx.Observable.ajax({
			url: '/api/bookmarks/weekly',
			method: 'GET'
		}).subscribe(req => {
			this.setState({weeks: req.response});
		});
	}
	render() {
		var {weeks} = this.state;
		return weeks ? (
			<div>
				<h2>Bookmarks last-use-date by week</h2>
				<ul className={compStyles.weeks}>
					{weeks.map(w => (
						<li key={w.week}>
							<span className={compStyles.week}>{w.week.split(/ /)[0]}</span>
							<a href={`?week=${w.week}`}>
								<span>{w.count}</span>
							</a>
						</li>))}
				</ul>
			</div>) : <span>Loading...</span>;
	}
}

class Week extends Component {
	state = {list: null};
	componentWillMount() {
		var {week} = this.props;
		Rx.Observable.ajax({
			url: `/api/bookmarks/weekof?week=${encodeURIComponent(week)}`,
			method: 'GET'
		}).subscribe(req => {
			this.setState({list: sortBy(req.response, 'lastUse')});
		});
	}
	render() {
		var {list} = this.state,
			{week} = this.props;
		return (
			<div>
				<h2>Bookkmarks for week of {week.split(/ /)[0]}</h2>
				{list ? (
					<ul className={compStyles.bookmarks}>
						{list.map(b => (
							<li key={b.id}>
								<a href={`${window.location.origin}/heatmap/?bookmark=_${b.id}`}>
									<span className={compStyles.id}>{b.id}</span>
								</a>
								<span>{b.lastUse}</span>
							</li>))}
					</ul>) : <span>Loading...</span>}
				<br/>
				<a href={`${window.location.origin}/bookmarks/`}>
					All bookmarks
				</a>
			</div>);
	}
}

var params = allParameters();
var Main = params.week ? Week : Weekly;

ReactDOM.render(<Main week={params.week && params.week[0]}/>, main);
