import sc from 'science';

var nrd = sc.stats.bandwidth.nrd;
var variance = sc.stats.variance;

export function kde() {
	var k = sc.stats.kde();
	k.bandwidth(function(x) {
		var bw = nrd(x);
		if (bw === 0) {
			bw = variance(x);
		}

		return bw;
	});
	return k;
}


