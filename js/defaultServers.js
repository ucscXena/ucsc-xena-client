'use strict';

var servers = {
	localHub: 'https://local.xena.ucsc.edu:7223',
	publicHub: 'https://ucscpublic.xenahubs.net',
	tcgaHub: 'https://tcga.xenahubs.net',
	icgcHub: 'https://icgc.xenahubs.net',
	toilHub: 'https://toil.xenahubs.net',
	pcawgHub: 'https://pcawg.xenahubs.net',
	singlecellHub: 'https://singlecell.xenahubs.net'
};

module.exports = {
	serverNames: {
		[servers.localHub]: "My computer hub",
		[servers.publicHub]: 'UCSC public hub',
		[servers.tcgaHub]: 'TCGA hub',
		[servers.icgcHub]: 'ICGC hub',
		[servers.toilHub]: 'GA4GH-BD2K (TOIL) hub',
		[servers.pcawgHub]: 'PCAWG public hub',
		[servers.singlecellHub]: 'Single cell hub'
	},
	defaultServers: [
		servers.localHub,
		servers.publicHub,
		servers.tcgaHub,
		servers.icgcHub,
		servers.toilHub
	]
};
