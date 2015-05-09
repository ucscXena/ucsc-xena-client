/*jslint browser:true, nomen: true */
/*global define: false, confirm: true */

// http://localhost:8080/datapages/?ga4gh=1&start=41215898&end=51215899&referenceName=17&variantSetId=Clinvar
// http://localhost:8080/datapages/?ga4gh=1&start=41215898&end=41215899&referenceName=17&variantSetId=Clinvar
// http://http://localhost:8080/datapages/?ga4gh=1

define(["ga4gh-rxjs", "dom_helper", "metadataStub", "rx-dom", "../css/datapages.css"],
  function (ga4gh, dom_helper, metadataStub, Rx) {
  'use strict';

  function start(query_string, baseNode){
    if (!query_string.start || !query_string.end || !query_string.referenceName || !query_string.variantSetId){
      searchPage(baseNode);
    }
    else {
      queryStringPage(query_string,baseNode);
    }

  }

  function queryVariants(startPos, endPos, referenceName, variantSetId){
    var url = "http://ec2-54-148-207-224.us-west-2.compute.amazonaws.com/ga4gh/v0.5.1";
    if (!isNaN(startPos) && !isNaN(endPos) && referenceName && variantSetId){
      return ga4gh.variants(url, {
        start: startPos,
        end: endPos,
        referenceName: referenceName,
        variantSetIds: [variantSetId]
      });
    }
  }

  function queryStringPage(query_string, basenode){
    var startPos =  parseInt(query_string.start)-1,//41215898
      endPos = parseInt(query_string.end),//41215899
      referenceName = query_string.referenceName, //17
      variantSetId = query_string.variantSetId,
      query= queryVariants(startPos, endPos, referenceName, variantSetId),
      node= dom_helper.sectionNode("dataset");

      query.subscribe(function (results) {
        results.variants.map(function (variant){
          var div = document.createElement("div");
          buildVariantDisplay(variant, div);
          node.appendChild(div);
        });
      });
      basenode.appendChild(node);
  }

  function searchPage (baseNode){
    var frameset = document.createElement("frameset"),
      fLeft = document.createElement('frame'),
      fRight = document.createElement('frame'),
      startInput = document.createElement("INPUT"),
      endInput = document.createElement("INPUT"),
      chromInput = document.createElement("INPUT"),
      searchButton = document.createElement("BUTTON"),
      leftBaseNode = document.createElement("div"),
      rightBaseNode = document.createElement("div"),
      startPos, endPos, referenceName, variantSetId,
      query;

    chromInput.setAttribute("value","17");
    startInput.setAttribute("value","41215824");
    endInput.setAttribute("value","41215900");

    baseNode.appendChild(frameset);
    frameset.setAttribute("cols","25%,75%");
    frameset.appendChild(fLeft);
    frameset.appendChild(fRight);

    fLeft.contentDocument.body.appendChild(leftBaseNode);
    fRight.contentDocument.body.appendChild(rightBaseNode);

    leftBaseNode.setAttribute("id","leftFrame");
    leftBaseNode.appendChild(dom_helper.elt("labelsameLength","Chr"));
    leftBaseNode.appendChild(dom_helper.elt("resultsameLength", chromInput));
    leftBaseNode.appendChild(document.createElement("br"));

    leftBaseNode.appendChild(dom_helper.elt("labelsameLength","Start"));
    leftBaseNode.appendChild(dom_helper.elt("resultsameLength", startInput));
    leftBaseNode.appendChild(document.createElement("br"));

    leftBaseNode.appendChild(dom_helper.elt("labelsameLength","End"));
    leftBaseNode.appendChild(dom_helper.elt("resultsameLength", endInput));
    leftBaseNode.appendChild(document.createElement("br"));

    searchButton.setAttribute("class","vizbutton");
    searchButton.appendChild(document.createTextNode("Search"));
    leftBaseNode.appendChild(searchButton);

    searchButton.addEventListener("click", function () {
      startPos = parseInt(startInput.value.trim())-1;
      endPos = parseInt(endInput.value.trim());
      referenceName = chromInput.value.trim();
      variantSetId = "Clinvar";

      query = queryVariants(startPos, endPos, referenceName, variantSetId);
      query.subscribe(function (results) {
        results.variants.map(function (variant){
          var div = document.createElement("div");
          buildVariantDisplay(variant, div);
          rightBaseNode.appendChild(div);
        });
      });

    });
  }

  function findMetaData(variantSetId){
    var found = metadataStub.variantSets.variantSets.filter(function(item){
        return (item.id === variantSetId? true: false);
      }),
      metaDataJSON ={};

    if (found.length>0){
      found[0].metadata.map(function(item){
        metaDataJSON[item.key]= item;
      });
      return metaDataJSON;
    }
  }
  function buildVariantDisplay(variant, node) {
    var id = variant.id,
      chr = variant.referenceName,
      startPos = variant.start +1,
      endPos = variant.end,
      reference = variant.referenceBases,
      alt = variant.alternateBases,
      variantSetId = variant.variantSetId,
      selectedKeys,
      metaData;

    selectedKeys = metadataStub.selectedKeys[variantSetId];
    variant.INFO = variant.info;
    metaData = findMetaData(variantSetId);

    node.appendChild (dom_helper.elt("h2",id));
    //chr start (- end)
    node.appendChild(document.createTextNode("chr"+ chr+":"));
    node.appendChild(document.createTextNode(" "+ startPos.toLocaleString()));
    if (startPos !== endPos) {
      node.appendChild(document.createTextNode(" - "+ endPos.toLocaleString()));
    }
    node.appendChild(document.createElement("br"));
    //ref, alt
    node.appendChild(document.createTextNode("Reference sequence : "+reference));
    node.appendChild(document.createElement("br"));
    node.appendChild(document.createTextNode("Variant sequences : "));
    node.appendChild(document.createTextNode(alt));
    node.appendChild(document.createElement("br"));

    //info
    if (metaData){
      var value, intepretation;

      selectedKeys.map(function(key){
        value = eval("variant."+key);
        if (metaData[key]){
          if ( metaData[key].type ==="Flag") {
            if (value) {
              node.appendChild(document.createTextNode(metaData[key].description));
              node.appendChild(document.createElement("br"));
            }
          } else if ( metaData[key].type ==="Integer"){
            node.appendChild(document.createTextNode(metaData[key].description+" : "));
            intepretation = metaData[key].info[value];
            if (intepretation){
              node.appendChild(document.createTextNode(intepretation));
            }
            node.appendChild(document.createElement("br"));
          }
          else if ( metaData[key].type ==="String") {
            node.appendChild(document.createTextNode(metaData[key].description+" : "));
            if (Object.keys(metaData[key].info).length){
              var text = value[0].split(",").map(function(oneValue){
                intepretation = oneValue.split("|").map(function(v){
                  return metaData[key].info[v];
                }).join(" | ");
                return intepretation;
              }).join(", ");
              node.appendChild(document.createTextNode(text));
            } else {
              node.appendChild(document.createTextNode( value[0].replace("\\x2c", "") ));
            }
            node.appendChild(document.createElement("br"));
          }
        }

      });
    }
  }

  return {
    start: start
  };
});
