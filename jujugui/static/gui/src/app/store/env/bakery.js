/*
This file is part of the Juju GUI, which lets users view and manage Juju
environments within a graphical interface (https://launchpad.net/juju-gui).
Copyright (C) 2012-2013 Canonical Ltd.

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

/**
 * Bakery holds the context for making HTTP requests
 * that automatically acquire and discharge macaroons.
 *
 * @module env
 * @submodule env.bakery
 */

YUI.add('juju-env-bakery', function(Y) {

  var module = Y.namespace('juju.environments.web');
  var macaroon = Y.namespace('macaroon');

  /**
   * Bakery client inspired by the equivalent GO code.
   *
   * This object exposes the ability to perform requests
   * that automatically acquire and discharge macaroons
   *
   * @class Bakery
   */
  function Bakery(config) {
    // Invoke Base constructor, passing through arguments.
    Bakery.superclass.constructor.apply(this, arguments);
    this.webhandler = new Y.juju.environments.web.WebHandler();
  }

  Bakery.NAME = 'bakery';

  Y.extend(Bakery, Y.Base, {
    /**
      Send get request.

      @param {String} The path to make the api request to.
      @param {String} The path to make a request to set the cookie.
      @param {Function} successCallback Called when the api request completes
        successfully.
      @param {Function} failureCallback Called when the api request fails
        with a response of >= 400 except 407 where it does authentication.
    */
    sendGetRequest: function(path, setCookiePath, successCallback, failureCallback) {
      var macaroon = Y.Cookie.get('Macaroons');
      var headers = null;
      if (macaroon !== null) {
        headers = {'Macaroons': macaroon}
      }
      this.webhandler.sendGetRequest(
          path, headers, null, null, null, false,
          this._requestHandlerWithInteraction.bind(this, path, setCookiePath,
                                                   successCallback, failureCallback)
      );
    },

    /**
      Handles the request response from the _makeRequest method, calling the
      supplied failure callback if the response status was >= 400 or passing the
      response object to the supplied success callback. For 407 response it will
      request authentication through the macaroon provided in the 407 response.

      @method _requestHandlerWithInteraction
      @param {String} The path to make the api request to.
      @param {String} The path to make a request to set the cookie.
      @param {Function} successCallback Called when the api request completes
        successfully.
      @param {Function} failureCallback Called when the api request fails
        with a response of >= 400 (except 407).
      @param {Object} response The XHR response object.
    */
    _requestHandlerWithInteraction: function(path, setCookiePath, successCallback, failureCallback, response) {
      var target = response.target;
      if (target.status === 407) {
        var jsonResponse = JSON.parse(target.responseText);
        this._authenticate(
          jsonResponse.Info.Macaroon,
          setCookiePath,
          this.sendGetRequest.bind(this, path, null, successCallback, failureCallback),
          failureCallback
        );
      } else {
        this._requestHandler(successCallback, failureCallback, response);
      }
    },

    /**
      Handles the request response from the _makeRequest method, calling the
      supplied failure callback if the response status was >= 400 or passing the
      response object to the supplied success callback.

      @method _requestHandler
      @param {Function} successCallback Called when the api request completes
        successfully.
      @param {Function} failureCallback Called when the api request fails
        with a response of >= 400.
      @param {Object} response The XHR response object.
    */
    _requestHandler: function(successCallback, failureCallback, response) {
      var target = response.target;
      if (target.status >= 400) {
        failureCallback(response);
        return;
      }
      successCallback(response);
    },

    /**
      Authenticate  by discharging the macaroon and
      then set the cookie by calling the authCookiePath provided

      @method authenticate
      @param {Macaroon} The macaroon to be discharged
      @param {String} The path where to send put request to set the cookie back
      @param {Function} The request to be sent again in case of successful authentication
      @param {Function} The callback failure in case of wrong authentication
    */
    _authenticate: function(m, authCookiePath, requestFunction, failureCallback) {
      try {
        macaroon.discharge(
          macaroon.import(m),
          this._obtainThirdPartyDischarge.bind(this),
          this._processDischarges.bind(this, authCookiePath, requestFunction, failureCallback),
          failureCallback
        );
      } catch (ex) {
        failureCallback(ex.message);
      }
    },

    /**
      Process the discharged macaroon and call the end point to be able to set a cookie
      for the origin domain, then call the original function.

      @method _processDischarges
      @param {String} The path where to send put request to set the cookie back
      @param {Function} The request to be sent again in case of successful authentication
      @param {Function} The callback failure in case of wrong authentication
      @param {[Macaroon]} The macaroons being discharged
    */
    _processDischarges: function(authCookiePath, requestFunction, failureCallback, discharges) {
      var jsonMacaroon = macaroon.export(discharges);
      var content = JSON.stringify({'Macaroons': jsonMacaroon});
      this.webhandler.sendPutRequest(
        authCookiePath,
        null, content, null, null, null, true,
        this._requestHandler.bind(
          this,
          function() {
            Y.Cookie.set('Macaroons', btoa(JSON.stringify(jsonMacaroon)));
            requestFunction.apply()
          },
          failureCallback
        )
      );
    },

    /**
      Go to the discharge endpoint to obtain the third party discharge.

      @method obtainThirdPartyDischarge
      @param {String} The origin location
      @param {String} The third party location where to discharge
      @param {Function} The macaroon to be discharge
      @param {Function} The request to be sent again in case of successful authentication
      @param {Function} The callback failure in case of wrong authentication
    */
    _obtainThirdPartyDischarge: function(location, thirdPartyLocation, condition,
                                         successCallback, failureCallback) {
      thirdPartyLocation += '/discharge';
      var headers = {'Content-Type': 'application/x-www-form-urlencoded'};
      var content = 'id=' + encodeURI(condition) + '&location=' + encodeURI(location);
      this.webhandler.sendPostRequest(
          thirdPartyLocation,
          headers, content, null, null, null, false,
          this._requestHandler.bind(
            this,
            function(e) {
              try {
                var dm = macaroon.import(JSON.parse(e.target.responseText).Macaroon);
                successCallback(dm);
              } catch (ex) {
                failureCallback(ex.message);
              }
            },
            this._interact.bind(this, successCallback, failureCallback)
          )
      );
		},

    /**
      Interact to be able to sign-in to get authenticated.

      @method _interact
      @param {Function} The callback function to be sent in case of successful authentication
      @param {Function} The callback function failure in case of wrong authentication
    */
    _interact: function(successCallback, failureCallback, e) {
      var response = JSON.parse(e.target.responseText);
      if (response.Code !== 'interaction required') {
        failureCallback(response.Code);
        return
      }

      // Let's open a pop up
      var popup = window.open(
        response.Info.VisitURL,
        'Login'
      );

      this.webhandler.sendGetRequest(
          response.Info.WaitURL,
          null, null, null, null, false,
          this._requestHandler.bind(
            this,
            function(e) {
              var dm = macaroon.import(JSON.parse(e.target.responseText).Macaroon);
              successCallback(dm)
            },
            function(e) {
              failureCallback(e.target.responseText)
            }
          )
      );
    }
  });

  module.Bakery = Bakery;

}, '0.1.0', {
  requires: [
    'base',
    'cookie',
    'node',
    'juju-env-base',
    'juju-env-web-handler',
    'macaroon'
  ]
});
