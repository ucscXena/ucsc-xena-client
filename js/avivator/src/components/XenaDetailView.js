import {DetailView} from 'ucsc-xena-viv';

// Extend DetailView to allow data overlay.
export default class XenaDetailView extends DetailView {
	constructor(attrs) {
		super(attrs);
		this.mergeLayers = attrs.mergeLayers;
	}
	getLayers(arg) {
		var layers = super.getLayers(arg);
		return [...layers, ...this.mergeLayers];
	}
}
