/*jslint browser:true, nomen: true */
/*global define: false, confirm: true */

// http://localhost:8080/datapages/?ga4gh=1&start=41215898&end=51215899&referenceName=17&variantSetId=Clinvar
// http://localhost:8080/datapages/?ga4gh=1&start=41215898&end=41215899&referenceName=17&variantSetId=Clinvar

// http://http://localhost:8080/datapages/?ga4gh=1

define(["ga4ghQuery", "dom_helper", "metadataStub", "rx-dom", "underscore_ext","../css/datapages.css"],
  function (ga4ghQuery, dom_helper, metadataStub, Rx, _) {
  'use strict';

  var url = metadataStub.ga4ghURL;

  function start(query_string, baseNode){
    var source = Rx.Observable.zipArray(ga4ghQuery.variantSetsQuery(url), //from server
      ga4ghQuery.metadata(url)),  //stub
      serverMeta ={}, stubMeta={},
      metadata={};

    source.subscribe(function (x){
      //server
      x[0].map(function(r){
        serverMeta[r.id] = r.metadata;
      });
     //stub
      x[1].map(function(r){
        stubMeta[r.id] = r.metadata;
      });

      //organize metadata
      Object.keys(serverMeta).map(function (dataset){
        metadata[dataset]=buildMetaDataJSON(serverMeta[dataset]);
        if (stubMeta[dataset]){
          update(metadata[dataset], stubMeta[dataset]);
        }
      });


      if (!query_string.start || !query_string.end || !query_string.referenceName ){
        searchPage(baseNode, metadata);
      }
      else {
        queryStringPage(query_string, metadata, baseNode);
      }

    });
  }

  function buildMetaDataJSON(meta){
    var metaDataJSON ={};
    meta.map(function(item){
      metaDataJSON[item.key]= item;
    });
    return metaDataJSON;

  }

  function update(meta, newMeta){
    newMeta.map(function(item){
      if (meta[item.key]){
        meta[item.key] = item;
      }
    });
  }


  function queryVariants(startPos, endPos, referenceName, variantSetId){
    if (!isNaN(startPos) && !isNaN(endPos) && referenceName && variantSetId){
      return ga4ghQuery.variants({
        url:url,
        start: startPos,
        end: endPos,
        chrom: referenceName,
        dataset: variantSetId
      });
    }
  }

  function queryStringPage(query_string, metadata, basenode){
    var startPos =  parseInt(query_string.start)-1,
      endPos = parseInt(query_string.end),
      referenceName = query_string.referenceName,
      variantSetIds = query_string.variantSetId ?
        [query_string.variantSetId] : Object.keys(metadata),
      ref =  query_string.ref,
      alt = query_string.alt,
      gene = query_string.gene,
      allVariants={},
      queryArray = variantSetIds.map(
        variantSetId=>queryVariants(startPos, endPos, referenceName, variantSetId)),
      query = Rx.Observable.zipArray(queryArray),
      queryPlusArray = variantSetIds.map(
        variantSetId=>queryVariants(startPos-2, endPos+2, referenceName, variantSetId)),
      queryPlus = Rx.Observable.zipArray(queryPlusArray),
      container, sideNode, mainNode,
      resultsNode,
      variantsDropDown, dropDownValue,showAllStatus=false,
      data, dataPlus;


    function displayData(data){
      if (!data){
        return;
      }

      var found =0;

      sideNode.innerHTML="";
      resultsNode.innerHTML="";

      if (gene){
        sideNode.appendChild(dom_helper.elt("H3",gene));
        sideNode.appendChild(document.createElement("br"));
      }

      data.map(function(results){
        var index = data.indexOf(results),
          variantSetId = variantSetIds[index];

        allVariants[variantSetId]={};
        results.map(function (variant){
          if (!showAllStatus &&
            ((ref && ref !== variant.referenceBases) || (alt && variant.alternateBases.indexOf(alt)===-1))){
            return;
          }

          var variantId =variant.id+"__"+variant.referenceBases+"__"+variant.alternateBases;
          //record how many times the exact same variants are stored in the database
          if ( allVariants[variantSetId][variantId] === undefined){
            var div = document.createElement("div");
            buildVariantDisplay(variant, div, metadata[variantSetId],gene);
            resultsNode.appendChild(div);
            allVariants[variantSetId][variantId]=0;
            found =1;
          }
          allVariants[variantSetId][variantId]++;
        });

        //sidebar info
        sideNode.appendChild(dom_helper.elt("b",variantSetId));
        sideNode.appendChild(document.createElement("br"));
        Object.keys(allVariants[variantSetId]).map(id=>{
          var displayId= id.replace(variantSetId+":","").split("__")[0];
          sideNode.appendChild(dom_helper.hrefLink(displayId+" ("+allVariants[variantSetId][id]+")",
            "#"+id));
          sideNode.appendChild(document.createElement("br"));
        });
        sideNode.appendChild(document.createElement("br"));
      });
      if (!found){
        resultsNode.appendChild(document.createElement("br"));
        resultsNode.appendChild(document.createTextNode("No variants found."));
      }
    }

    container = dom_helper.elt("div");
    container.setAttribute("id", "content-container");
    basenode.appendChild(container);

    //sidebar
    sideNode= dom_helper.sectionNode("leftsidebar");
    container.appendChild(sideNode);

    //mainnode
    mainNode= dom_helper.sectionNode("dataset");
    container.appendChild(mainNode);

    //all variants button -  all variants (not jsut the specific variants) at start-end interval
    if (ref && alt){
      var option,
        dropDown = [{
            "value": "specific",
            "text": "Show only variants with the specific alternation from " + ref +" to "+alt +
              " at this interval chr"+referenceName+": "+query_string.start+" - "+query_string.end,
            "index": 0
          }, // specific
          {
            "value": "all",
            "text": "Show all variants at this interval chr"+referenceName+": "+query_string.start+" - "+query_string.end,
            "index": 1
          }, // all variants
          {
            "value": "allPlus",
            "text": "Show all variants at slightly bigger interval chr"+referenceName+": "+
              (startPos-1)+" - "+(startPos+2),
            "index": 2
          } // all variants plus some wiggle room
        ];

      variantsDropDown = document.createElement("select");
      variantsDropDown.setAttribute("class", "dropDown");

      dropDown.forEach(function (obj) {
        option = document.createElement('option');
        option.value = obj.value;
        option.textContent = obj.text;
        variantsDropDown.appendChild(option);
      });

      variantsDropDown.addEventListener('change', function () {
        dropDownValue = variantsDropDown.options[variantsDropDown.selectedIndex].value;
        if (dropDownValue==="all" || dropDownValue ==="allPlus"){
          showAllStatus= true;
        } else {
          showAllStatus =false;
        }

        if (dropDownValue ==="all" || dropDownValue==="specific") {
          if (!data){
            query.subscribe(function (ret) {
              data = ret;
              displayData(data);
            });
          }
          displayData(data);
        }
        else if (dropDownValue ==="allPlus"){
          if (!dataPlus){
            queryPlus.subscribe(function (ret) {
              dataPlus = ret;
              displayData(dataPlus);
            });
          }
          displayData(dataPlus);
        }
      });
      mainNode.appendChild(variantsDropDown);
    }

    resultsNode = document.createElement("div");
    mainNode.appendChild(resultsNode);

    if (!data){
      query.subscribe(function (ret) {
        data = ret;
        displayData(data);
      });
    }
  }

  function searchPage (baseNode, metadata){
    var frameset = document.createElement("frameset"),
      fLeft = document.createElement('frame'),
      fRight = document.createElement('frame'),
      startInput = document.createElement("INPUT"),
      endInput = document.createElement("INPUT"),
      chromInput = document.createElement("INPUT"),
      searchButton = document.createElement("BUTTON"),
      div,
      leftBaseNode = document.createElement("div"),
      rightBaseNode,
      startPos, endPos, referenceName,
      variantSetIds,
      query;

    chromInput.setAttribute("value","17");
    startInput.setAttribute("value","41215824");
    endInput.setAttribute("value","41215900");
    variantSetIds = Object.keys(metadata);

    baseNode.appendChild(frameset);
    frameset.setAttribute("cols","25%,75%");
    frameset.appendChild(fLeft);
    frameset.appendChild(fRight);

    fRight.setAttribute("id","fRight");
    fLeft.contentDocument.body.appendChild(leftBaseNode);

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
    variantSetIds.map(function(id){
      div = document.createElement("input");
      div.setAttribute("type","checkbox");
      div.setAttribute("id","variantSetId_"+ id);
      div.setAttribute("checked", true);
      leftBaseNode.appendChild(div);
      leftBaseNode.appendChild(document.createTextNode(id));
      leftBaseNode.appendChild(document.createElement("br"));
    });

    searchButton.setAttribute("class","vizbutton");
    searchButton.appendChild(document.createTextNode("Search"));
    leftBaseNode.appendChild(searchButton);

    searchButton.addEventListener("click", function () {
      startPos = parseInt(startInput.value.trim())-1;
      endPos = parseInt(endInput.value.trim());
      referenceName = chromInput.value.trim();

      var oldFrame = document.getElementById("fRight"),
        newFrame = document.createElement('frame');

      oldFrame.parentNode.replaceChild(newFrame, oldFrame);
      newFrame.contentDocument.body.innerHTML="";
      newFrame.setAttribute("id","fRight");
      rightBaseNode = document.createElement("div");
      newFrame.contentDocument.body.appendChild(rightBaseNode);

      variantSetIds.map(function(id){
        var found=0;

        if (fLeft.contentDocument.getElementById("variantSetId_"+ id).checked){
          query = queryVariants(startPos, endPos, referenceName, id);
          query.subscribe(function (results) {
            results.map(function (variant){
              var div = document.createElement("div");
              buildVariantDisplay(variant, div, metadata[id]);
              rightBaseNode.appendChild(div);
              found =1;
              });
            if (!found){
              rightBaseNode.appendChild(document.createTextNode("No variant found in "+ id+"."));
              rightBaseNode.appendChild(document.createElement("br"));
            }
          });
        }
      });
    });
  }

  function buildVariantDisplay(variant, node, metaData, gene) {
    var id = variant.id,
      chr = variant.referenceName,
      startPos = variant.start,
      endPos = variant.end,
      reference = variant.referenceBases,
      alt = variant.alternateBases,
      variantSetId = variant.variantSetId,
      pos, posURL,
      label,div,
      selectedKeys, allKeys, otherKeys;

    function getValue(key){
      var keys = key.split("."),
        obj = variant;

      keys.map(k=> obj=obj[k]);
      return obj;
    }

    function displayKeyValuePair (key, bold){
        var value, intepretation, text;

        value = getValue(key);
        //console.log(metaData[key].description, key, value);
        if (metaData[key]){
          label = metaData[key].description;
          label = label.charAt(0).toUpperCase()+ label.slice(1);
          if ( metaData[key].type ==="Flag") {
            if (value) {
              node.appendChild(document.createTextNode(label+ " : "));
              text = value[0];
            }
          }
          else if ( metaData[key].type ==="Integer"){
            node.appendChild(document.createTextNode(label+" : "));
            intepretation = metaData[key].info[value];
            text = intepretation? intepretation: value[0];
          }
          else if ( metaData[key].type ==="Float"){
            node.appendChild(document.createTextNode(label+" : "));
            text = value[0];
          }
          else if ( metaData[key].type ==="String") {
            node.appendChild(document.createTextNode(label+" : "));
            if (Object.keys(metaData[key].info).length){
              text = value[0].split(",").map(function(oneValue){
                intepretation = _.uniq(oneValue.split("|").map(function(v){
                  return metaData[key].info[v];
                })).join(" | ");
                return intepretation;
              }).join(", ");
            } else {
              text = value[0].split(",").map(function(oneValue){
                return oneValue.replace(/\\x[a-fA-F0-9]{2}/g," ").replace(/\|/g," | "); //messy input
              }).join(", ");
            }
          }

          if (text){
            if (bold){
              div = document.createElement("b");
              node.appendChild(dom_helper.elt("i",div));
            } else {
              div = document.createElement("i");
              node.appendChild(div);
            }
            div.appendChild(document.createTextNode(text));
            node.appendChild(document.createElement("br"));
            node.appendChild(document.createElement("br"));
          }
        }
      }


    selectedKeys = metadataStub.selectedKeys[variantSetId];
    allKeys =Object.keys(variant.info).map(key=>"INFO."+key);
    if (!selectedKeys){
      otherKeys = allKeys;
    } else {
      otherKeys = allKeys.filter(key=>(selectedKeys.indexOf(key)===-1));
    }
    variant.INFO = variant.info;

    div = dom_helper.elt("a", id);
    div.setAttribute("name",id+"__"+reference+"__"+alt);
    node.appendChild (dom_helper.elt("h2", div));

    //source dbs
    if (metadataStub.externalUrls[variantSetId]){
      node.appendChild(document.createTextNode("Source: " ));

      var key, value;
      if (metadataStub.externalUrls[variantSetId].type === "position"){
        value = metadataStub.externalUrls[variantSetId].url;
        [ "chr","startPos","endPos","reference","alt" ].map(variable=>{
          value = value.replace("$"+variable, eval(variable));
        });
        div= dom_helper.hrefLink(metadataStub.externalUrls[variantSetId].name, value);
        node.appendChild(div);
      } else if (metadataStub.externalUrls[variantSetId].type === "key"){
        key = metadataStub.externalUrls[variantSetId].value;
        value = getValue(key);

        node.appendChild(document.createTextNode(metadataStub.externalUrls[variantSetId].name));
        if (value && value[0]) {
          value[0].split("|").map(acc=>{
            node.appendChild(document.createTextNode(" "));
            div = dom_helper.hrefLink(variantSetId+":"+acc,
              metadataStub.externalUrls[variantSetId].url.replace("$key",acc));
            node.appendChild(div);
          });
        }
      } else if (gene && metadataStub.externalUrls[variantSetId].type === "gene"){
        value = gene;
        node.appendChild(document.createTextNode(metadataStub.externalUrls[variantSetId].name+" "));
        div = dom_helper.hrefLink(variantSetId+":"+gene,
          metadataStub.externalUrls[variantSetId].url.replace("$gene",gene));
        node.appendChild(div);
      } else {
        value = metadataStub.externalUrls[variantSetId].url;
        div= dom_helper.hrefLink(metadataStub.externalUrls[variantSetId].name, value);
        node.appendChild(div);
      }
      node.appendChild(document.createElement("br"));
    }

    //chr start (- end) GB link
    pos = "chr"+ chr+": " + startPos.toLocaleString();
    node.appendChild(document.createTextNode("UCSC Genome Browser (hg19): "));
    if (startPos !== endPos) {
      pos = pos + " - "+ endPos.toLocaleString();
    }
    posURL = "http://genome.ucsc.edu/cgi-bin/hgTracks?db=hg19&position="+encodeURIComponent("chr"+chr + ':' + startPos + '-' + endPos);
    node.appendChild(dom_helper.hrefLink(pos, posURL));
    node.appendChild(document.createElement("br"));

    //ref, alt
    node.appendChild(document.createTextNode("Reference sequence : "));
    node.appendChild(dom_helper.elt("b", reference));
    node.appendChild(document.createElement("br"));
    node.appendChild(document.createTextNode("Variant sequences : "));
    div = document.createElement("b");
    node.appendChild(div);
    div.appendChild(document.createTextNode(alt));
    node.appendChild(document.createElement("br"));
    node.appendChild(document.createElement("br"));
    //info
    if (metaData){
      var bold;
      if (selectedKeys){
        bold = true;
        selectedKeys.map(key=>displayKeyValuePair(key, bold));
      }
      if (otherKeys){
        bold = false;
        otherKeys.sort().map(key=>displayKeyValuePair(key, bold));
      }
    }
  }

  return {
    start: start
  };
});
