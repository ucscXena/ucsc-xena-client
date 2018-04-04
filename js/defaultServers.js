'use strict';

var servers = {
	localHub: 'https://local.xena.ucsc.edu:7223',
	publicHub: 'https://ucscpublic.xenahubs.net',
	tcgaHub: 'https://tcga.xenahubs.net',
	icgcHub: 'https://icgc.xenahubs.net',
	toilHub: 'https://toil.xenahubs.net',
	pcawgHub: 'https://pcawg.xenahubs.net',
	singlecellHub: 'https://singlecell.xenahubs.net',
	pancanAtlasHub: 'https://pancanatlas.xenahubs.net',
	treehouseHub: 'https://treehouse.xenahubs.net',
	gdcHub: "https://gdc.xenahubs.net"
};

module.exports = {
	servers,
	serverNames: {
		[servers.localHub]: "My computer hub",
		[servers.publicHub]: 'UCSC public hub',
		[servers.tcgaHub]: 'TCGA hub',
		[servers.icgcHub]: 'ICGC hub',
		[servers.toilHub]: 'GA4GH (TOIL) hub',
		[servers.pcawgHub]: 'PCAWG public hub',
		[servers.singlecellHub]: 'Single-cell RNAseq hub',
		[servers.pancanAtlasHub]: 'PanCanAtlas Hub',
		[servers.treehouseHub]: 'Treehouse Hub',
		[servers.gdcHub]: 'GDC Hub'
	},
	defaultServers: [
		servers.localHub,
		servers.publicHub,
		servers.tcgaHub,
		servers.pancanAtlasHub,
		servers.icgcHub,
		servers.toilHub,
		servers.treehouseHub,
		servers.gdcHub
	],
	publicServers: [
		servers.publicHub,
		servers.tcgaHub,
		servers.icgcHub,
		servers.toilHub,
		servers.pancanAtlasHub,
		servers.pcawgHub,
		servers.treehouseHub,
		servers.gdcHub
	]
};
