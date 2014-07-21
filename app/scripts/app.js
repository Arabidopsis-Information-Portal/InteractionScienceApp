/*global cytoscape*/
'use strict';

/**
 * Tests to see if cytoscape.js and arbor.js are already available on the page.
 * If not, it adds them by appending to document.body.
 */
(function(window, $, undefined) {

  var DEBUG, log, init, assignViewOptions, renderCytoscape, renderLegend, getEdgeInfo, ajaxFail, parseItToJSON;

  DEBUG = true;
  log = function log( message ) {
    if ( DEBUG ) {
      console.log( message );
    }
  };

  init = function init() {
    var el, i, cytoscapeJsUrl, arborJsUrl, reCytoscape, reArbor, hasCytoscape, hasArbor, allScripts;

    cytoscapeJsUrl = 'sites/all/libraries/InteractionScienceApp/cytoscape.js/cytoscape.min.js';
    arborJsUrl = 'sites/all/libraries/InteractionScienceApp/cytoscape.js/arbor.js';

    hasCytoscape = hasArbor = false;
    reCytoscape = new RegExp( cytoscapeJsUrl );
    reArbor = new RegExp( arborJsUrl );
    allScripts = document.querySelectorAll( 'script' );

    for ( i = 0; i < allScripts.length && !( hasCytoscape && hasArbor ); i++ ) {
      hasCytoscape = hasCytoscape || reCytoscape.test( allScripts[i].src );
      hasArbor = hasArbor || reCytoscape.test( allScripts[i].src );
    }

    if ( !hasCytoscape ) {
      log( 'adding Cytoscape.js' );

      el = document.createElement( 'script' );
      el.src = cytoscapeJsUrl;
      el.type = 'text/javascript';
      document.body.appendChild( el );
    }
    if (! hasArbor) {
      log( 'adding Arbor.js' );

      el = document.createElement( 'script' );
      el.src = arborJsUrl;
      el.type = 'text/javascript';
      document.body.appendChild( el );
    }
  };

  assignViewOptions = function assignViewOptions( elements ) {
    var colors, experiments, colorsused, fontSize, i, j, k, m, found;

    for ( m = 0; m < elements.edges.length; m++ ) {
      if ( elements.edges[ m ].data.confidenceScore !== '-' ) {
        if ( elements.edges[ m ].data.confidenceScore < 0.30 ) {
          elements.edges[ m ].data.lineThickness = 1;
        }
        else if ( elements.edges[ m ].data.confidenceScore >= 0.30 && elements.edges[ m ].data.confidenceScore < 0.40 ) {
          elements.edges[ m ].data.lineThickness = 3;
        }
        else if ( elements.edges[ m ].data.confidenceScore >= 0.40 && elements.edges[ m ].data.confidenceScore < 0.50 ) {
          elements.edges[ m ].data.lineThickness = 6;
        }
        else if ( elements.edges[ m ].data.confidenceScore >= 0.50 && elements.edges[ m ].data.confidenceScore < 0.60 ) {
          elements.edges[ m ].data.lineThickness = 9;
        }
        else if ( elements.edges[ m ].data.confidenceScore >= 0.60 && elements.edges[ m ].data.confidenceScore < 0.70 ) {
          elements.edges[ m ].data.lineThickness = 11;
        }
        else if ( elements.edges[ m ].data.confidenceScore >= 0.70 ) {
          elements.edges[ m ].data.lineThickness = 15;
        }
      }
    }

    /*
     * loop through the json elements received through the AJAX call and
     * assign colors to the experiment types.
     */
    colors = [
      '#2BAB2B', '#3366CC', '#B8008A', '#7634D9', '#FF8A14', '#FF0000',
      '#74F774', '#73A2FF', '#F28DD9', '#AF8DE0', '#FA9696', '#175E17',
      '#0A3180', '#69004E', '#400F8A', '#5C330A', '#730000'
    ];
    experiments = [];
    colorsused = [];
    k = 0;

    /*
     * based on the number of nodes, changes up the font size - otherwise the
     * edge labels make it impossible to see the nodes, which is annoying
     */
    fontSize = 10;
    if (elements.nodes.length < 25) {
      fontSize = 20;
    }
    else if (elements.nodes.length >= 25 && elements.nodes.length < 50) {
      fontSize = 15;
    }
    else if (elements.nodes.length >= 50 && elements.nodes.length < 100) {
      fontSize = 12;
    }
    else if (elements.nodes.length >= 100) {
      fontSize = 9;
    }

    for ( i = 0; i < elements.edges.length; i++ ) {
      // find out whether this particular experiment has been assigned a color yet
      found = 0;
      for ( j = 0; j < experiments.length; j++ ) {
        if (experiments[ j ] === elements.edges[ i ].data.humanReadable ) {
          found = 1;
          elements.edges[ i ].data.lineColor = colorsused[ j ];
        }
      }

      /*
       * if it's new give it a color, and add the new color and the
       * corresponding experiment name to two arrays. They will be used to
       * construct the graph key later.
       *
       * k is the counter to which colors have been used already. if the
       * number of experiments is greater than the number of colors, the
       * counter resets and it starts reusing colors.
       */
      if ( experiments.indexOf( elements.edges[ i ].data.humanReadable ) === -1 ) {
        experiments.push( elements.edges[ i ].data.humanReadable );
        colorsused.push( colors[ k ] );
        elements.edges[ i ].data.lineColor = colors[ k ];
        k++;
        if ( k >= colors.length ) {
          k = 0;
        }
      }
    }

    return {
      keyInfo: {
        colorsused: colorsused,
        experiments: experiments
      },
      fontSize: fontSize,
      elements: elements
    };
  };

  /**
   * Loads Cy from the JSON received; assigns view options based on this data,
   * and constructs the Cytoscape object.
   */
  renderCytoscape = function renderCytoscape(view) {

    $('#ebi_iv_cy').cytoscape({
      layout: {
        name: 'arbor',
        liveUpdate: true,
        maxSimulationTime: 4000,
        padding: [ 50, 50, 50, 50 ],
        simulationBounds: undefined,
        ungrabifyWhileSimulating: true,
        repulsion: undefined,
        stiffness: undefined,
        friction: undefined,
        gravity: true,
        fps: undefined,
        precision: undefined,
        nodeMass: undefined,
        edgeLength: undefined,
        stepSize: 1,
        stableEnergy: function(energy) {
          var e = energy;
          return (e.max <= 0.5) || (e.mean <= 0.3);
        }
      },
      minZoom: 0.25,
      style: cytoscape.stylesheet()
        .selector('node')
        .css({
          'content': 'data(name)',
          'text-valign': 'center',
          'color': 'white',
          'font-size': view.fontSize,
          'text-outline-width': 2,
          'text-outline-color': '#888'
        })
        .selector('edge')
        .css({
          'line-color': 'data(lineColor)',
          'width': 'data(lineThickness)'
        })
        .selector(':selected')
        .css({
          'background-color': 'black',
          'line-color': 'black',
          'target-arrow-color': 'black',
          'source-arrow-color': 'black'
        })
        .selector('.faded')
        .css({
          'opacity': 0.25,
          'text-opacity': 0
        }),

      elements: view.elements,

      // bind functions to various events - notably, the mouseover tooltips
      ready: function() {
        var cy = this;

        // giddy up...

        cy.elements().unselectify();

        cy.on('tap', 'node', function(e) {
          var node = e.cyTarget;
          var neighborhood = node.neighborhood().add(node);

          cy.elements().addClass('faded');
          neighborhood.removeClass('faded');
        });

        cy.on('tap', function(e) {
          if (e.cyTarget === cy) {
            cy.elements().removeClass('faded');
          }
        });

        //on mouseover/mouseout, display and hide the appropriate type of mouseover (by calling the makeMouseover()/unmakeMouseover() functions)
        cy.on('mouseover', 'edge', function( e ) {
          var tip = $('#ebi_iv_tooltip');
          tip.html(getEdgeInfo(e.cyTarget));
          tip.show();
        });

        cy.on('mouseout', 'edge', function() {
          $('#ebi_iv_tooltip').hide();
        });
      }, //end ready function
    }); //end Cytoscape object options

    // display cytoscape div
    $('#ebi_iv_cy').removeClass('hidden');

  }; //end render()

  //places key on the page
  renderLegend = function renderLegend(keyInfo) {
    var experiments, colorsused, key, i, ul;

    experiments = keyInfo.experiments;
    colorsused = keyInfo.colorsused;
    key = $('#ebi_iv_colors');
    key.empty();
    key.append('<h5>Interaction determination by line color</h5>');
    ul = $('<ul>');
    for ( i = 0; i < experiments.length; i++ ) {
      ul.append('<li style="color:' + colorsused[i] + '">' + experiments[i] + '</li>');
    }
    key.append(ul);

    $('#ebi_iv_legend').removeClass('hidden');
  };

  getEdgeInfo = function getEdgeInfo(target) {
    // var sourceName = target.data('source');
    // var targetName = target.data('target');
    var experiment = target.data('humanReadable');
    var CV = target.data('confidenceScore');
    var publication = target.data('publication');
    var firstAuthor = target.data('firstAuthor');
    var sourceDatabase = target.data('sourceDatabase');

    return '<dl class="dl-horizontal">' +
      '<dt>Experiment</dt><dd>' + experiment +
      '</dd><dt>Confidence score</dt><dd>' + CV +
      '</dd><dt>First author</dt><dd>' + firstAuthor +
      '</dd><dt>Source Database</dt><dd>' + sourceDatabase +
      '</dd><dt>Publication</dt><dd>' + publication +
      '</dd></dl>';
  };

  ajaxFail = function ajaxFail(url, errorType) {
    $('.result').addClass('alert alert-danger');
    $('.result').html('We could not load the gene data from ' + url);
    if (errorType !== '') {
      $('.result').append('<br>Error type: ' + errorType);
    }
  };

  parseItToJSON = function parseItToJSON(data) {
    var nodes, proteins, edges, elements, view, line, line2, line3, tmp, p1, p2, p3, p4, p5, p6, p7, p8, i, j;

    nodes = [];
    proteins = [];
    edges = [];

    data = data.split( /\n/ );
    for ( i = 0; i < data.length; i++ ) {
      line = data[ i ].split( /\t/ );
      if ( line[ 0 ].length > 0 ) {
        p1 = line[ 0 ];
        p2 = line[ 1 ];
        p3 = line[ 6 ];
        p5 = line[ 14 ];
        p6 = line[ 7 ];
        p7 = line[ 8 ];
        p8 = line[ 12 ];

        if ( p3 !== '-' ) {
          p3 = p3.replace( 'psi-mi:"MI:', '' );
          p4 = p3.slice( 6, p3.indexOf( ')' ) );
          p3 = p3.slice( 0, 4 );
        }

        if ( p5 !== '-' ) {
          p5 = p5.substring( p5.indexOf( ':' ) + 1 );
        }

        p6 = p6.replace( '|', '; ' );
        line2 = p7.split( '|' );
        p7 = '';
        for (j = 0; j < line2.length; j++) {
          tmp = line2[j].substring(line2[j].indexOf(':') + 1);
          p7 = p7 + tmp;
        }
        p7 = p7.slice(0, p7.indexOf(';'));

        line3 = p8.split('|');
        p8 = '';
        for (j = 0; j < line3.length; j++) {
          tmp = line3[j].substring(line3[j].indexOf('(') + 1);
          tmp = tmp.substring(0, tmp.length - 1);
          p8 = p8 + tmp + '; ';
        }
        p8 = p8.slice(0, p8.indexOf(';'));

        //add to 'nodes' proteins array if not already in there
        if (proteins.indexOf(p1) === -1) {
          proteins.push(p1);
          nodes.push({
            data: {
              id: p1,
              name: p1
            }
          });
        } else {
          log('not added');
        }
        if (proteins.indexOf(p2) === -1) {
          proteins.push(p2);
          nodes.push({
            data: {
              id: p2,
              name: p2
            }
          });
        } else {
          log('not added');
        }


        var duplicate = false;
        for (var m = 0; m < edges.length; m++) {
          if ((((p1 === edges[m].data.source) && (p2 === edges[m].data.target)) || ((p2 === edges[m].data.source) && (p1 === edges[m].data.target))) && (p3 === edges[m].data.lineColor) && (p5 === edges[m].data.confidenceScore)) {
            duplicate = true;
          }
        }
        if (!duplicate) {
          edges.push({
            data: {
              source: p1,
              target: p2,
              lineColor: p3,
              humanReadable: p4,
              confidenceScore: p5,
              lineThickness: '-',
              firstAuthor: p6,
              publication: p7,
              sourceDatabase: p8
            }
          });
        }
      }
    }

    elements = {
      nodes: nodes,
      edges: edges
    };

    log(elements); ///prints new JSON to the console.

    // font size, color
    view = assignViewOptions(elements);

    // render legend
    renderLegend(view.keyInfo);

    // render cytoscape
    renderCytoscape(view);
  };

  /* go! */
  init();

  $('#ebi_iv_gene_form_reset').on('click', function() {
    $('#ebi_iv_cy').addClass('hidden');
    $('#ebi_iv_gene').val('');
    $('#ebi_iv_colors').empty();
    $('#ebi_iv_legend').hide();
    $('#ebi_iv_tooltip').empty();
    $('.result').empty();
  });

  /*
   * Retrieves data, then parses it into a JSON file, containing all the
   * information needed to construct the Cytoscape object.
   */
  $( 'form[name=ebi_iv_gene_form]' ).on( 'submit', function( e ) {
    e.preventDefault();

    var url = 'https://api.araport.org/data/EBI_IntAct/alpha/';

    $('.result').empty();
    var gene = $('#ebi_iv_gene').val();
    //did the user enter the name of a gene?
    if (gene.length > 0) {
      //perform ajax GET
      var request = $.get(url + gene, function(data) { //success function
        if (data.length <= 0) {
          ajaxFail(url, '');
        } else { //if data was retrieved
          parseItToJSON(data);
        }
      }, 'text');

      request.error(function(jqXHR, textStatus, errorThrown) {
        var errorType = '';

        if (textStatus === 'timeout') {
          errorType = 'server is not responding';
        }
        else if (textStatus === 'error') {
          errorType = errorThrown;
        }
        ajaxFail(url, errorType);
      });
    } else {
      window.alert('You must enter a gene first.');
      return;
    }
  }); /// end gene submit function

})(window, jQuery);
