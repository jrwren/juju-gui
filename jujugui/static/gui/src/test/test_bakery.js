/**
This file is part of the Juju GUI, which lets users view and manage Juju
environments within a graphical interface (https://launchpad.net/juju-gui).
Copyright (C) 2012-2015 Canonical Ltd.

This program is free software: you can redistribute it and/or modify it under
the terms of the GNU Affero General Public License version 3, as published by
the Free Software Foundation.

This program is distributed in the hope that it will be useful, but WITHOUT
ANY WARRANTY; without even the implied warranties of MERCHANTABILITY,
SATISFACTORY QUALITY, or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero
General Public License for more details.

You should have received a copy of the GNU Affero General Public License along
with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

'use strict';

describe('Bakery', function() {
  var bakery, macaroon, utils, Y;

  before(function (done) {
    var modules = ['juju-env-bakery', 'juju-tests-utils', 'macaroon' ];
    Y = YUI(GlobalConfig).use(modules, function (Y) {
      utils = Y['juju-tests'].utils;
      macaroon = Y['macaroon'];
      done();
    });
  });

  beforeEach(function () {
    bakery = new Y.juju.environments.web.Bakery();
  });

  afterEach(function () {
    bakery = null;
  });

  it('can be instantiated with the proper config values', function() {
    assert.equal(
        bakery.webhandler instanceof Y.juju.environments.web.WebHandler,
        true);
  });

  describe('_requestHandler', function() {
    var success, failure;

    beforeEach(function() {
      success = utils.makeStubFunction();
      failure = utils.makeStubFunction();
    });

    it('calls the failure callback if status > 400', function() {
      bakery._requestHandler(success, failure, {
        target: { status: 404 }
      });
      assert.equal(success.callCount(), 0);
      assert.equal(failure.callCount(), 1);
    });

    it('calls the success callback if status < 400', function() {
      bakery._requestHandler(success, failure, {
        target: { status: 200 }
      });
      assert.equal(success.callCount(), 1);
      assert.equal(failure.callCount(), 0);
    });
  });

  describe('_requestHandlerWithInteraction', function() {
    var success, failure;

    beforeEach(function() {
      success = utils.makeStubFunction();
      failure = utils.makeStubFunction();
    });

    it('calls getRequest after authentication', function() {
      var getRequest = utils.makeStubMethod(
        bakery.webhandler, 'sendGetRequest');
      var called = 0;
      bakery.webhandler.sendPutRequest = function(a,b,c,d,e,f,g,h) {
        called++;
        h({'target' : {
          status: 200
        }});
      };
      this._cleanups.push(getRequest.reset);
      var m = macaroon.export(
        macaroon.newMacaroon(['secret'], 'some id', 'a location')
      );
      bakery._requestHandlerWithInteraction('path', 'set-cookie-auth', success, failure, {
        target: {
          status: 407,
          responseText: '{"Info": {"Macaroon": ' + JSON.stringify(m) + '}}'
        }
      });
      assert.equal(called, 1);
      assert.equal(getRequest.callCount(), 1);
      var getArgs = getRequest.lastArguments();
      assert.equal(getArgs[0], 'path');
      assert.equal(failure.callCount(), 0);
    });
  });
});

