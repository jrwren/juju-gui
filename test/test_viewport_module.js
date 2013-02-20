'use strict';

describe('views.ViewportModule (Topology module)', function() {
  var views, Y, testUtils;
  before(function(done) {
    Y = YUI(GlobalConfig).use(['node', 'juju-views', 'juju-tests-utils'],
        function(Y) {
          views = Y.namespace('juju.views');
          testUtils = Y.namespace('juju-tests').utils;
          done();
        });
  });

  it('aborts a resize if the canvas is not available', function() {
    var container = {
      one: testUtils.getter({'.topology-canvas': undefined}, {})
    };
    var view = new views.ViewportModule();
    view.getContainer = function() {return container;};
    // Since we do not provide most of the environment needed by "resized" we
    // know that it takes an early out if calling it does not raise an
    // exception.
    view.resized();
  });

  it('aborts a resize if the "svg" element is not available', function() {
    var container = {
      one: testUtils.getter({'svg': undefined}, {})
    };
    var view = new views.ViewportModule();
    view.getContainer = function() {return container;};
    // Since we do not provide most of the environment needed by "resized" we
    // know that it takes an early out if calling it does not raise an
    // exception.
    view.resized();
  });

  it('should fire before and after events', function() {
    var events = [];
    var topo = {
      fire: function(e) {
        events.push(e);
      },
      get: function() {}
    };
    var container = {
      one: testUtils.getter({}, {})
    };

    var view = new views.ViewportModule();
    // Provide a test container that likes to return empty objects.
    view.getContainer = function() {return container;};
    // Ignore setting dimensions, we're not testing that bit.  However, we
    // would like to know when this method is called relative to the
    // beforePageSizeRecalculation and afterPageSizeRecalculation events, so we
    // will inject a marker into the event stream.
    view.setAllTheDimensions = function() {
      events.push('setAllTheDimensions called');
    };
    // Inject a topology component that records events.
    view.set('component', topo);
    view.resized();
    events.should.eql(
        ['beforePageSizeRecalculation',
         'setAllTheDimensions called',
         'afterPageSizeRecalculation']);
  });
});

describe('views.ViewportModule.setAllTheDimensions', function() {
  var views, Y, testUtils, view, width, height, canvas, svg, topo, zoomPlane;
  before(function(done) {
    Y = YUI(GlobalConfig).use(['node', 'juju-views', 'juju-tests-utils'],
        function(Y) {
          views = Y.namespace('juju.views');
          testUtils = Y.namespace('juju-tests').utils;
          done();
        });
  });

  beforeEach(function() {
    height = Math.floor(Math.random() * 1000);
    width = Math.floor(Math.random() * 1000);
    // Build test doubles that record height and width settings.
    topo = {vis: {}};
    topo.set = testUtils.setter(topo);
    topo.vis.attr = testUtils.setter(topo.vis);
    view = new views.ViewportModule();
    canvas = {style: {}};
    canvas.setStyles = function(styles) {
      Y.mix(canvas.style, styles, true);
    };
    zoomPlane = {};
    zoomPlane.setAttribute = testUtils.setter(zoomPlane);
    svg = {};
    svg.setAttribute = testUtils.setter(svg);
    var dimentions = {
      height: height,
      width: width
    };
    // Since all of the tests inspect the output of setAllTheDimensions, we can
    // just call it here and the tests will just contain assertions.
    view.setAllTheDimensions(dimentions, canvas, svg, topo, zoomPlane);
  });

  it('should set canvas dimensions', function() {
    assert.equal(canvas.style.width, width + 'px');
    assert.equal(canvas.style.height, height + 'px');
  });

  it('should set zoom plane dimensions', function() {
    assert.equal(zoomPlane.width, width);
    assert.equal(zoomPlane.height, height);
  });

  it('should set svg dimensions', function() {
    assert.equal(svg.width, width);
    assert.equal(svg.height, height);
  });

  it('should set topo dimensions', function() {
    assert.deepEqual(topo.size, [width, height]);
  });

  it('should set topo.vis dimensions', function() {
    assert.equal(topo.vis.width, width);
    assert.equal(topo.vis.height, height);
  });

});