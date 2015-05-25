/*global module: false, require: false */
'use strict';

var index = o => _.object(o, _.range(o.length));

var colorSettings ={
  clinvar: {
    // 2,3 -> benign, likely benign
    // 4,5 -> likely pathogenic, pathogenic
    // 6,7 -> drug response, histocompatibility
    // 0, 255 -> uncertain, other
    CLNSIG: {
      color: d3.scale.ordinal().domain(['2', '3', '4', '5', '6', '7'])
        .range(['blue', 'lightblue', 'pink', 'red', 'orange', 'orange']),
      filter: ['6', '7', '3', '2', '4', '5'],
      order: index(['6', '7', '3', '2', '4', '5']),
    },

    // 1, 3 => germ line
    // 2, 3 => somatic
    CLNORIGIN: {
      color: d3.scale.ordinal().domain(['1', '2', '3'])
        .range(['blue', 'red', 'purple']),
      filter: ['1', '2', '3'],
      order: index(['1', '2', '3']),
    },

    //"1-Notpathogenicorofnoclinicalsignificance",
    //"2-Likelynotpathogenicoroflittleclinicalsignificance",
    //"3-Uncertain",
    //"4-Likelypathogenic",
    //"5-Definitelypathogenic",
    iarc_class: {
      color: d3.scale.ordinal().domain(['1', '2','3','4','5'])
        .range(['blue', 'lightblue', 'black', 'pink', 'red']),
      filter: ['3','2','1','4','5'],
      order: index(['3','2','1','4','5']),
    }
  }
};

module.exports = {
  colorSettings: colorSettings
};
