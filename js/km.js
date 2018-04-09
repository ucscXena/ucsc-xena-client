/*eslint-disable camelcase */
'use strict';

var jStat = require('jStat').jStat,
	_ = require('./underscore_ext'),
	linearAlgebra = require('linear-algebra')(),
	Matrix = linearAlgebra.Matrix;

var reduce = _.reduce,
	map = _.map,
	groupBy = _.groupBy,
	sortBy = _.sortBy,
	last = _.last,
	uniq = _.uniq,
	pluck = _.pluck,
	filter = _.filter;

function pluckTte(x) {
	return pluck(x, 'tte');
}


// kaplan-meier
// See http://en.wikipedia.org/wiki/Kaplan%E2%80%93Meier_estimator
//
// tte  time to exit (event or censor)
// ev   is truthy if there is an event.
function compute(tte, ev) {
	var exits = sortBy(map(tte, function (x, i) { return { tte: x, ev: ev[i] }; }), 'tte'), // sort and collate
		uexits = uniq(pluckTte(exits), true),                    // unique tte
		gexits = groupBy(exits, function (x) { return x.tte; }),  // group by common time of exit
		dini = reduce(uexits, function (a, tte) {                 // compute d_i, n_i for times t_i (including censor times)
			var group = gexits[tte],
				l = last(a) || {n: exits.length, e: 0},
				events = filter(group, function (x) { return x.ev; });

			a.push({
				n: l.n - l.e,     // at risk
				e: group.length,  // number exiting
				d: events.length, // number events (death)
				t: group[0].tte   // time
			});
			return a;
		}, []),

		// s : the survival probability from t=0 to the particular time (i.e. the end of the time interval)
		// rate : the chance of an event happened within the time interval (as in t and the previous t with an event)
		si = reduce(dini, function (a, dn) { // survival at each t_i (including censor times)
			var l = last(a) || { s: 1 };
			if (dn.d) {                      // there were events at this t_i
				a.push({t: dn.t, e: true, s: l.s * (1 - dn.d / dn.n), n: dn.n, d: dn.d, rate: dn.d / dn.n});
			} else {                          // only censors
				a.push({t: dn.t, e: false, s: l.s, n: dn.n, d: dn.d, rate: null});
			}
			return a;
		}, []);

	return si;
}


//log-rank test of the difference between KM plots

// http://www.ncbi.nlm.nih.gov/pmc/articles/PMC3059453/
// a good article to understand KM and comparing KM plots using log-rank test,
// they used the pearson chisquared test to compute test statistics
// sum of (O-E)^2/E

// http://oto.sagepub.com/content/143/3/331.long
// a good article to understand KM and comparing KM plots using log-rank test and hazardous ratio test
// they also used the pearson chisquared test to compute test statistics

// http://www.ncbi.nlm.nih.gov/pmc/articles/PMC403858/
// introduce pearson chi-square to compute logrank statistics, however mentioned there is another way

// https://stat.ethz.ch/education/semesters/ss2011/seminar/contents/presentation_2.pdf
// introduce the other way

// http://ssp.unl.edu/Log%20Rank%20Test%20For%20More%20Than%202%20Groups.pdf
// gives basic idea of the "other" way
// (O-E)^2/V V is variance for two groups and covariance for multiple groups

// https://cran.r-project.org/web/packages/survival/survival.pdf
// R use (O-E)^2/V V is variance for two groups and covariance for multiple groups

//https://github.com/CamDavidsonPilon/lifelines/blob/master/lifelines/statistics.py
//python implementation, identical results to R

// covariance calculation
// https://books.google.com/books?id=nPkjIEVY-CsC&pg=PA451&lpg=PA451&dq=multivariate+hypergeometric+distribution+covariance&source=bl&ots=yoieGfA4bu&sig=dhRcSYKcYiqLXBPZWOaqzciViMs&hl=en&sa=X&ved=0CEQQ6AEwBmoVChMIkqbU09SuyAIVgimICh0J3w1x#v=onepage&q=multivariate%20hypergeometric%20distribution%20covariance&f=false

//https://plot.ly/ipython-notebooks/survival-analysis-r-vs-python/#Using-R
// R online tutorial

// chisquare distribution at
// https://github.com/jstat/jstat/blob/master/src/distribution.js
// testing jStat accuracy: http://www.socscistatistics.com/pvalues/chidistribution.aspx

// p value = 1- jStat.chisquare.cdf(x, dof );  -- x is chisquare statistics, dof is degree of freedom
// for comparing two plots, the dof is n-1 = 1, comparing three plots dof = n-1 = 2

// given a theoretical survival curve (si), and tte + ev ( tte and ev is the data ),
// compute the expected total number of events
// report observed n events, expected n events. pearson's chi-square component (O-E)^2/E

function expectedObservedEventNumber(si, tte, ev) {
	var exits = sortBy(map(tte, function (x, i) { return { tte: x, ev: ev[i] }; }), 'tte'), // sort and collate
		uexits = _.uniq(_.pluck(exits, 'tte'), true),             // unique tte
		gexits = groupBy(exits, function (x) { return x.tte; }),  // group by common time of exit
		data = reduce(uexits, function (a, tte) {                 // sorted by time stats from the input data as in tte,ev
			var group = gexits[tte],
				l = last(a) || {n: exits.length, e: 0},
				events = filter(group, function (x) { return x.ev; });

			a.push({
				n: l.n - l.e,     // at risk
				e: group.length,  // number exiting
				d: events.length, // number events (death)
				t: group[0].tte   // time
			});
			return a;
		}, []),
		expectedNumber,
		observedNumber,
		dataByTimeTable = [];

	si = si.filter(function(item) {  //only keep the curve where there is an event
		if (item.e) {return true;}
		else {return false;}
	});

	expectedNumber = reduce(si, function (memo, item) {
		var pointerInData = _.find(data, function (x) {
				if (x.t === item.t) {
					return true;
				}
				if (x.t > item.t) {
					return true;
				}
				return false;
			});


		if(pointerInData) {
			var expected = pointerInData.n * item.rate;
			dataByTimeTable.push(pointerInData);
			return memo + expected;
		}
		else {
			return memo;
		}

	}, 0);

	observedNumber = filter(ev, function(x) {return (x === 1);}).length; //1 is the internal xena converted code for EVENT

	return {
		expected: expectedNumber,
		observed: observedNumber,
		dataByTimeTable: dataByTimeTable,
		timeNumber: dataByTimeTable.length
	};
}


function logranktest (allGroupsRes, groupsTte, groupsEv) {
	var KM_stats,
		pValue,
		dof, // degree of freedom
		i, j, //groups
		t, //timeIndex
		O_E_table = [],
		O_minus_E_vector = [], O_minus_E_vector_minus1, // O-E and O-E drop the last element
		vv = [], vv_minus1, //covariant matrix and covraiance matrix drops the last row and column
		N, //total number of samples
		Ki, Kj, // at risk number from each group
		n; //total observed

	_.each(groupsTte, function (groupTte, i) {
		var group = {tte: groupTte, ev: groupsEv[i]},
			r = expectedObservedEventNumber(allGroupsRes, group.tte, group.ev);
			//console.log(group.name, group.tte.length, r.observed, r.expected,
			//	(r.observed-r.expected)*(r.observed-r.expected)/r.expected, r.timeNumber);
			if (r.expected) {
				O_E_table.push(r);
				O_minus_E_vector.push(r.observed - r.expected);
			}
		});

		dof = O_E_table.length - 1;

		// logrank stats covariance matrix vv
		for (i = 0; i < O_E_table.length; i++) {
			vv.push([]);
			for (j = 0;j < O_E_table.length; j++) {
				vv[i].push(0);
			}
		}

		for (i = 0; i < O_E_table.length; i++) {
			for (j = i; j < O_E_table.length; j++) {
				for (t = 0; t < allGroupsRes.length; t++) {
					N = allGroupsRes[t].n;
					n = allGroupsRes[t].d;
					if (t < O_E_table[i].timeNumber && t < O_E_table[j].timeNumber) {
						Ki = O_E_table[i].dataByTimeTable[t].n;
						Kj = O_E_table[j].dataByTimeTable[t].n;
						// https://books.google.com/books?id=nPkjIEVY-CsC&pg=PA451&lpg=PA451&dq=multivariate+hypergeometric+distribution+covariance&source=bl&ots=yoieGfA4bu&sig=dhRcSYKcYiqLXBPZWOaqzciViMs&hl=en&sa=X&ved=0CEQQ6AEwBmoVChMIkqbU09SuyAIVgimICh0J3w1x#v=onepage&q=multivariate%20hypergeometric%20distribution%20covariance&f=false
						// when N==1: only 1 subject, no variance
						if (i !== j && N !== 1) {
							vv[i][j] -= n * Ki * Kj * (N - n) / (N * N * (N - 1));
							vv[j][i] = vv[i][j] ;
						}
						else {//i==j
							if(N !== 1) {
								vv[i][i] += n * Ki * (N - Ki) * (N - n) / (N * N * (N - 1));
							}
						}
					}
				}
			}
		}

		O_minus_E_vector_minus1 = O_minus_E_vector.slice(0, O_minus_E_vector.length - 1);
		vv_minus1 = vv.slice(0, vv.length - 1);
		for (i = 0; i < vv_minus1.length; i++) {
			vv_minus1[i] = vv_minus1[i].slice(0, vv_minus1[i].length - 1);
		}
		var vv_minus1_copy = vv_minus1.slice(0, vv_minus1.length);
		for (i = 0;i < vv_minus1.length; i++) {
			vv_minus1_copy[i] = vv_minus1[i].slice(0, vv_minus1[i].length);
		}

		if (dof > 0) {
			var m = new Matrix([O_minus_E_vector_minus1]),
				m_T = new Matrix([O_minus_E_vector_minus1]).trans(),
				vv_minus1_inv = new Matrix(jStat.inv(vv_minus1_copy)),
				mfinal = m.dot(vv_minus1_inv).dot(m_T);

			KM_stats = mfinal.data[0][0];

			pValue = 1 - jStat.chisquare.cdf(KM_stats, dof);
		}

		return {
			dof,
			KM_stats,
			pValue
		};
}


module.exports = {
	compute: compute,
	logranktest: logranktest
};
