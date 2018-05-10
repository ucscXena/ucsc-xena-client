'use strict';
var _ = require('./underscore_ext');

// transcribed from wikipedia.
function LCSLength(X, Y) {
	var m = X.length, n = Y.length,
		C = _.times(m + 1, () => new Array(n + 1)),
		i, j;

	for (i = 0; i <= m; ++i) {
       C[i][0] = 0;
	}

	for (j = 0; j <= n; ++j) {
		C[0][j] = 0;
	}

	for (i = 0; i < m; ++i) {
		for (j = 0; j < n; ++j) {
			C[i + 1][j + 1] = X[i] === Y[j] ? C[i][j] + 1 :
				Math.max(C[i + 1][j], C[i][j + 1]);
		}
	}
    return C[m][n];
}

module.exports = LCSLength;
