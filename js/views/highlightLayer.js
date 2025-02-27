import {IconLayer} from 'deck.gl';
import {COORDINATE_SYSTEM} from '@deck.gl/core';
import locationOn from './locationon.png';

export default ({data = [], modelMatrix}) => new IconLayer({
	id: 'highlight-ring',
    coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
	data: data,
	modelMatrix,
	iconAtlas: locationOn,
	iconMapping: {locationon: {x: 0, y: 0, width: 24, height: 32, anchorY: 32}},
	getIcon: () => 'locationon',
    getColor: () => [0, 0, 0, 255],
	getPosition: d => d,
	getSize: 20,
	billboard: true
});
