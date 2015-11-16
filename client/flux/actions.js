var auth = require('../auth/auth');
var constants = require('./constants');
var dispatcher = require('./dispatcher');
var store = require('./store');
var $ = require('jquery');

var actions = {

  signupUser: function(accInfo, caller) {
    $.ajax({
      type: "POST",
      url: '/api/signup',
      data: accInfo,
      error: function(err) {
        console.log(err);
      },
      success: function(response){
        actions.loadUser(response.user);
        auth.storeToken(response.token);
        caller.history.pushState(null, '/');
      }
    });
  },

  loginUser: function(accInfo, caller){
    $.ajax({
      type: "POST",
      url: '/api/login',
      data: accInfo,
      error: function(err) {
        console.log(err);
      },
      success: function(response){
        auth.storeToken(response.token);
        caller.history.pushState(null, '/');
      }
    });

  },

  loadUser: function(user) {
    dispatcher.handleAction({
      actionType: constants.LOAD_USER,
      data: user
    });
  },

  fetchUser: function() {

    var token = auth.getToken();
    console.log('calling fetch user')

    $.ajax({
      type: "GET",
      url: '/api/users',
      data: {
        token: token
      },
      error: function(err) {
        console.log(err);
      },
      success: function(res) {
        console.log(res);
        actions.loadUser(res.user);
      }
    });
  },

  fetchOrg: function() {
    $.ajax({
      type: "GET",
      url: '/api/org',
      error: function(err) {
        console.log(err);
      },
      success: function(res) {
        actions.loadOrg(res.org);
      }
    });
  },

  loadOrg: function(org) {
    dispatcher.handleAction({
      actionType: 'LOAD_ORG',
      data: org
    });
  }

};

module.exports = actions;
