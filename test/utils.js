'use strict';
// Test utils.

YUI(GlobalConfig).add('juju-tests-utils', function(Y) {
  var jujuTests = Y.namespace('juju-tests');

  jujuTests.utils = {

    SocketStub: function() {
      this.messages = [];

      this.close = function() {
        //console.log('close stub');
        this.messages = [];
      };

      this.transient_close = function() {
        this.onclose();
      };

      this.open = function() {
        this.onopen();
        return this;
      };

      this.msg = function(m) {
        //console.log('serializing env msg', m);
        this.onmessage({'data': Y.JSON.stringify(m)});
      };

      this.last_message = function(m) {
        return this.messages[this.messages.length - 1];
      };

      this.send = function(m) {
        //console.log('socket send', m);
        this.messages.push(Y.JSON.parse(m));
      };

      this.onclose = function() {};
      this.onmessage = function() {};
      this.onopen = function() {};

    },

    getter: function(attributes, default_) {
      return function(name) {
        if (attributes.hasOwnProperty(name)) {
          return attributes[name];
        } else {
          return default_;
        }
      };
    },

    setter: function(attributes) {
      return function(name, value) {
        attributes[name] = value;
      };
    },

    makeFakeBackendWithCharmStore: function() {
      var data = [];
      var charmStore = new Y.juju.CharmStore(
          {datasource: new Y.DataSource.Local({source: data})});
      var setCharm = function(name) {
        data[0] = Y.io('data/' + name + '-charmdata.json', {sync: true});
      };
      setCharm('wordpress');
      var fakebackend = new Y.juju.environments.FakeBackend(
          {charmStore: charmStore});
      fakebackend.login('admin', 'password');
      return {fakebackend: fakebackend, setCharm: setCharm};
    }

  };

}, '0.1.0', {
  requires: [
    'io',
    'datasource-local',
    'juju-charm-store',
    'juju-env-fakebackend'
  ]
});
