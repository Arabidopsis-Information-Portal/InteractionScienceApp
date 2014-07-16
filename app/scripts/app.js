/*global cytoscape*/
'use strict';

/**
 * Tests to see if cytoscape.js and arbor.js are already available on the page.
 * If not, it adds them by appending to document.body.
 */
(function() {
  var el, i, cytoscapeJsUrl, arborJsUrl, reCytoscape, reArbor, hasCytoscape, hasArbor, allScripts, log;

  var DEBUG = true;
  log = function( message ) {
    if ( DEBUG ) {
      console.log( message );
    }
  };

  cytoscapeJsUrl = 'vendor/cytoscape.js';
  arborJsUrl = 'vendor/arbor.js';

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
})();

jQuery(function($) {

  var DEBUG = true;
  var log = function( message ) {
    if ( DEBUG ) {
      console.log( message );
    }
  };

  // String.prototype.hashCode = function() {
  //   var hash = 0;
  //   if (this.length === 0) return hash;
  //   for (i = 0; i < this.length; i++) {
  //     char = this.charCodeAt(i);
  //     hash = ((hash << 5) - hash) + char;
  //     hash = hash & hash; // Convert to 32bit integer
  //   }
  //   return hash;
  // }

  var assignViewOptions = function( elements ) {
    var colors, experiments, colorsused, i, j, k, m, found;

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
      elements: elements
    };
  };

  /**
   * Loads Cy from the JSON received; assigns view options based on this data,
   * and constructs the Cytoscape object.
   */
  var render = function(elements) {
    //takes data structure, and assigns
    var result = assignViewOptions(elements);
    elements = result.elements;
    var keyInfo = result.keyInfo;
    buildKey(keyInfo);


    //based on the number of nodes, changes up the font size - otherwise the edge labels make it impossible to see the nodes, which is annoying
    var fontSize = 10;
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



    //now construct the Cytoscape object

    $('#cy').cytoscape({
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
          'font-size': fontSize,
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

      elements: elements,
      //bind functions to various events - notably, the mouseover tooltips
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
        cy.on('mouseover', 'edge', function(event) {
          var target = event.cyTarget;
          makeMouseover(target);
        });

        cy.on('mouseout', 'edge', function() {
          unmakeMouseover();
        });
      }, //end ready function
    }); //end Cytoscape object options

    $('#cy').removeClass('hidden');
  }; //end render()

  //places key on the page
  var buildKey = function(keyInfo) {
    var experiments = keyInfo.experiments;
    var colorsused = keyInfo.colorsused;
    $('#colorkey').append('<b>Interaction determination by line color: <br></b>');
    for (var i = 0; i < experiments.length; i++) {
      $('#colorkey').append('<span style="color:' + colorsused[i] + '">' + experiments[i] + '</span><br>');
    }

    //and unhide the key
    $('#outerkey').removeClass('hidden');

  };

  //called whenever there is a mouseover on an edge; shows the appropriate sort of mouseover - either tooltip or div.
  var makeMouseover = function(target) {
    if ($('input[name="edgedisplay"]:checked').val() === 'tooltip') {
      makeTooltips(target);

    } else if ($('input[name="edgedisplay"]:checked').val() === 'div') {
      makeDiv(target);
      $('#mouseover').removeClass('hidden');
    }
  };

  //called whenever the mouse leaves an edge - hides whichever sort of mouseover is currently in use
  var unmakeMouseover = function() {
    if ($('input[name="edgedisplay"]:checked').val() === 'tooltip') {
      $('#cy').qtip('hide');
    } else if ($('input[name="edgedisplay"]:checked').val() === 'div') {
      //$('#mouseover').addClass('hidden');
    }
  };

  var makeDiv = function(target) {
    // var sourceName = target.data('source');
    // var targetName = target.data('target');
    var experiment = target.data('humanReadable');
    var CV = target.data('confidenceScore');
    var publication = target.data('publication');
    var firstAuthor = target.data('firstAuthor');
    var sourceDatabase = target.data('sourceDatabase');
    $('#mouseover').text('');
    $('#mouseover').append('<b>Information about this edge</b> <br>Experiment: ' + experiment + '<br>Confidence score: ' + CV + '<br>First author: ' + firstAuthor + '<br>Source Database: ' + sourceDatabase + '<br>Publication: ' + publication);
  };

  var makeTooltips = function(target) {
    // var sourceName = target.data('source');
    // var targetName = target.data('target');
    var experiment = target.data('humanReadable');
    var CV = target.data('confidenceScore');
    var publication = target.data('publication');
    var firstAuthor = target.data('firstAuthor');
    var sourceDatabase = target.data('sourceDatabase');


    $('#cy').qtip({
      content: 'Experiment: ' + experiment + '<br>Confidence score: ' + CV + '<br>First author: ' + firstAuthor + '<br>Source Database: ' + sourceDatabase + '<br>Publication: ' + publication,
      show: {
        ready: true,
        delay: 500
      },
      hide: {
        distance: 5,
        event: 'click'
      },

      position: {
        my: 'top center',
        at: 'bottom center',
        target: 'mouse',
        adjust: {
          mouse: false,
          cyViewport: true
        }
      },
      style: {
        classes: 'qtip-bootstrap',
        tip: {
          width: 16,
          height: 8
        }
      }
    });
  };

  //hides the old mouseover, so the new one can be unhidden and filled by makeMouseover()
  $('input[name="edgedisplay"]').change(function() {
    if ($('input[name="edgedisplay"]:checked').val() === 'tooltip') {
      $('#mouseover').addClass('hidden');
    } else if ($('input[name="edgedisplay"]:checked').val() === 'div') {
      $('#cy').qtip('disable');
    }
  });

  $('#ebi_iv_gene_form_reset').on('click', function() {
    $('#cy').addClass('hidden');
    $('#ebi_iv_gene').val('');
    $('#colorkey').text('');
    $('#mouseover').text('');
    $('#mouseover').addClass('hidden');
  });

  var ajaxFail = function(url, errorType) {
    $('.result').addClass('alert alert-danger');
    $('.result').html('We could not load the gene data from ' + url);
    if (errorType !== '') {
      $('.result').append('<br>Error type: ' + errorType);
    }
  };

  ///Retrieves data, then parses it into a JSON file, containing all the information needed to construct the Cytoscape object.
  $( 'form[name=ebi_iv_gene_form]' ).on( 'submit', function( e ) {
    e.preventDefault();
    $('#colorkey').text('');
    $('#mouseover').text('');
    $('#mouseover').addClass('hidden');

    /////////////////////////////////hard-coded url for data file here, should be changed to point to the webservice supplying our data!
    //	var url = 'https://www.araport.org/apiproxy/BARClient/'+$('#gene').val();
    var url = 'https://api.araport.org/data/EBI_IntAct/alpha/';
    //////////////////////////////////////end hard coded url for data file



    $('.result').removeClass('alert alert-danger');
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

  var parseItToJSON = function(data) {
    var nodes = [];
    var proteins = [];
    var edges = [];
    var elements = {};

    var line, line2, line3, tmp, p1, p2, p3, p4, p5, p6, p7, p8;

    var i, j;

    data = data.split( '\n' );
    for ( i = 0; i < data.length; i++ ) {
      line = data[ i ].split( '\t' );
      if ( line[ 0 ].length > 0 ) {
        p1 = line[ 0 ];
        p2 = line[ 1 ];
        p3 = line[ 6 ];
        p5 = line[ 14 ];
        p6 = line[ 7 ];
        p7 = line[ 8 ];
        p8 = line[ 12 ];

        if ( p3 !== '-' ) {
          p3 = line[ 6 ].replace( 'psi-mi:"MI:', '' );
          p4 = p3.slice( 6, p3.indexOf( ')' ) );
          p3 = p3.slice( 0, 4 );
        }

        if ( p5 !== '-' ) {
          p5 = line[ 14 ].substring( line[ 14 ].indexOf( ':' ) + 1 );
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

    log(JSON.stringify(elements)); ///prints new JSON to the console.

    render(elements);
  };
}); //end Jquery functions
