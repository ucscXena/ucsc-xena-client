'use strict';

import PureComponent from '../PureComponent';
var React = require('react');
var {Portal} = require('react-overlays');
require('./Crosshair.css');

class Crosshair extends PureComponent {
	state = {mousing: false, x: -1, y: -1};

	componentWillReceiveProps(nextProps) {
		if (!nextProps.frozen) {
			this.setState({mousing: false, x: -1, y: -1});
		}
	}

	onMouseMove = (ev) => {
		var x = ev.clientX - ev.currentTarget.getBoundingClientRect().left;
		if (!this.props.frozen) {
			this.setState({mousing: true, x, y: ev.clientY});
		}
	};

	onMouseOut = () => {
		if (!this.props.frozen) {
			this.setState({mousing: false});
		}
	};

	render() {
		let {mousing, x, y} = this.state,
			{onMouseMove, onMouseOut} = this,
			{frozen, height, children} = this.props,
			cursor = frozen ? 'default' : 'none';
		return (
			<div style={{cursor}} onMouseMove={onMouseMove} onMouseOut={onMouseOut}>
				{children}
				{mousing ? <div className='crosshair crosshairV' style={{left: x, height}}/> : null}
				{mousing ?
					<Portal container={document.body}>
						<div className='crosshairs'>
							<span className='crosshair crosshairH' style={{top: y}}/>
						</div>
					</Portal> : null}
			</div>
		);
	}
}

module.exports = Crosshair;

