/*jslint browser: true, nomen: true */
/*global define: false */

define(['jquery', 'underscore'], function ($, _) {
	'use strict';

	var reduce = _.reduce,
		map = _.map,
		groupBy = _.groupBy,
		sortBy = _.sortBy,
		last = _.last,
		uniq = _.uniq,
		pluck = _.pluck,
		filter = _.filter;


	function pluck_tte(x) {
		return pluck(x, 'tte');
	}

	// kaplan-meier
	// See http://en.wikipedia.org/wiki/Kaplan%E2%80%93Meier_estimator
	//
	// tte  time to exit (event or censor)
	// ev   is truthy if there is an event.
	function compute(tte, ev) {
		var exits = sortBy(map(tte, function (x, i) { return { tte: x, ev: ev[i] }; }), 'tte'), // sort and collate
			uexits = uniq(pluck_tte(exits), true),                    // unique tte
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
					a.push({t: dn.t, e: true, s: l.s * (1 - dn.d / dn.n), rate : dn.d/dn.n});
				} else {                          // only censors
					a.push({t: dn.t, e: false, s: l.s, rate: null});
				}
				return a;
			}, []);

		return si;
	}


	//log-rank test of the difference between KM plots

	// http://www.ncbi.nlm.nih.gov/pmc/articles/PMC3059453/
	// a good article to understand KM and comparing KM plots using log-rank test,
	// they used the pearson chisquare test to compute test statistics

	// http://oto.sagepub.com/content/143/3/331.long
	// a good article to understand KM and comparing KM plots using log-rank test and hazardous ratio test
	// they also used the pearson chisquare test to compute test statistics

	// http://www.ncbi.nlm.nih.gov/pmc/articles/PMC403858/
	// introduce pearson chi-square to compute logrank statistics, however mentioned there is another way

	// https://cran.r-project.org/web/packages/survival/survival.pdf
	// this implementation should have  "identical" result to R survdiff with rho=0 (i.e. log rank test)
	// not pearson chi-square

	//https://github.com/CamDavidsonPilon/lifelines/blob/master/lifelines/statistics.py
	//python implementation, identical results to R

	//https://plot.ly/ipython-notebooks/survival-analysis-r-vs-python/#Using-R
	// R online tutorial

	// chisquare distribution at
	// https://github.com/jstat/jstat/blob/master/src/distribution.js
	// testing jStat accuracy: http://www.socscistatistics.com/pvalues/chidistribution.aspx

	// p value = 1- jStat.chisquare.cdf(x, dof );  -- x is chisquare statistics, dof is degree of freedom
	// for comparing two plots, the dof is n-1 = 1, comparing three plots dof = n-1 = 2

	// given a theoretical survival curve (si), and tte + ev ( tte and ev is the data ), compute the expected total number of events

	function expectedObservedEventNumber(si, tte, ev){
		var exits = sortBy(map(tte, function (x, i) { return { tte: x, ev: ev[i] }; }), 'tte'), // sort and collate
			uexits = uniq(pluck_tte(exits), true),                    // unique tte
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
			pearson_chi_squared_component;

		si.filter(function(item){  //only keep the curve where there is an event
			if (item.e) {return true;}
			else {return false;}
		});

		expectedNumber = reduce(si, function (memo, item) {
			var pointerInData = _.find(data, function (x){
					if (x.t === item.t){
						return true;
					}
					if (x.t > item.t){
						return true;
					}
					return false;
				});


			if(pointerInData){
				return memo + pointerInData.n * item.rate;
			}
			else {
				return memo;
			}

		},0);

		observedNumber = filter(ev, function(x) {return (x===1);}).length; //1 is the internal xena converted code for EVENT
		pearson_chi_squared_component = (observedNumber - expectedNumber)* (observedNumber - expectedNumber) / expectedNumber;

		return { expected: expectedNumber, observed: observedNumber, pearson_chi_squared_component: pearson_chi_squared_component};
	}

	return {
		compute: compute,
		expectedObservedEventNumber: expectedObservedEventNumber
	};
});
