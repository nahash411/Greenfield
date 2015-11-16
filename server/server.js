//
//  Module load
//

var express = require('express');
// var rewrite = require('express-urlrewrite');
var util = require('util');
var passport = require('passport');
var FacebookStrategy = require('passport-facebook').Strategy;
var LocalStrategy = require('passport-local').Strategy;
var path = require('path');
var session = require('express-session');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var methodOverride = require('method-override');
var Q = require('q');
var jwt = require('jwt-simple');

//
//  Database vars
//

var db = require('./db/config');
var User = require('./db/models/user');
var Org = require('./db/models/org');
var Account = require('./db/models/account');

//
//  App vars and API keys
//

var app = express();
var port = process.env.PORT || 8000;
var FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID || '793916147386968';
var FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || '268975de03f6b689fbffbf182d9281a5';

//
//  Middleware
//

app.use(cookieParser());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
app.use(methodOverride());
app.use(session({
  saveUninitialized: false,
  resave: false,
  secret: 'zthunder'
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static('./dist'));

//
//  Passport Strategies
//

passport.use(new LocalStrategy(
  function(username, password, done) {
    User.findOne({username:username}, function (err, user){
    if (err) { return done(err); }
    if (!user) {
      return done(null, false, { message: 'Incorrect username.' });
    }
    if (!user.comparePasswords(user.password)) {
      return done(null, false, { message: 'Incorrect password.' });
    }
    return done(null, user);
  })
  }
));

passport.use(new FacebookStrategy({
    clientID: FACEBOOK_APP_ID,
    clientSecret: FACEBOOK_APP_SECRET,
    callbackURL: "http://zthunder.herokuapp.com/auth/facebook/callback",
    profileFields: ['email', 'profileUrl']
  },
  function(accessToken, refreshToken, profile, done) {
    process.nextTick(function () {
      console.log("grabbed FB profile ", profile);
      console.log("accessToken ", accessToken);
      console.log("refreshToken", refreshToken);
      Account.addAccount("username", "facebook", profile.profileUrl);
      return done(null, profile);
    });
  }
));

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

//
// GET Routes
//

app.get('/auth/facebook', passport.authenticate('facebook'), function (req,res) {});

app.get('/auth/facebook/callback',
  passport.authenticate('facebook', {failureRedirect: '/api/login'}),
  function (req, res) {
    res.redirect('/');
  }
);

app.get('/api/users', function (req, res, next) {
  var token = req.query.token;
  var user = jwt.decode(token, 'zinnober');
  User.findOne({username: user.username})
    .then(function (foundUser){
      if(foundUser){
        res.send({user: foundUser});
      } else {
        res.send({error: "User not authorized"});
      }
    });
});

app.get('/api/orgs/:id', function (req, res, next) {
  console.log('Org ID: ' + req.params.id);
});

app.get('*', function (request, response){
  if (request.url === '/org/bundle.js') {
    response.sendFile(path.resolve(__dirname, '..', 'dist', 'bundle.js'));
  } else {
    response.sendFile(path.resolve(__dirname, '..', 'dist', 'index.html'));
  }
});

//
//  POST Routes
//

app.post('/api/signup', function (req, res, next) {
  console.log(req.body);
  User.addUser(req.body.username, req.body.password, req.body.email, 
    function (err, newUser){
      //Hacky thing to add user to org on init
      Org.addOrg("Hack Reactor", "hr34", function (org){
        Org.addUserToOrg(newUser.name, org.name);
      });
      //send back a valid token
      var token = jwt.encode(newUser, 'zinnober');
      res.send({user: newUser, token: token});
    }
  );
  // console.log(res);
});

app.post('/api/login', passport.authenticate('local'), function (req, res){
    var token = jwt.encode(req.user, 'zinnober');
    res.send({user: req.user, token: token});
  }
);

app.post('/api/createOrg', function (req, res, next) {
  var orgName = req.body.name;
  var orgCode = req.body.name.toLowerCase().split(' ').join('-');
  console.log('New Org data: ' + req.body);
  Org.addOrg(orgName, orgCode, function (err, newOrg){
    res.send(newOrg);
  });
});

//
//  Server Start
//

app.listen(port);
console.log('Server now listening on port ' + port);

//
//  Auth functions
//


function checkAuth (req, res, next) {
    // checking to see if the user is authenticated
    // grab the token in the header is any
    // then decode the token, which we end up being the user object
    // check to see if that user exists in the database
    var token = req.headers['x-access-token'];
    if (!token) {
      next(new Error('No token'));
    } else {
      var user = jwt.decode(token, 'secret');
      var findUser = Q.nbind(User.findOne, User);
      findUser({username: user.username})
        .then(function (foundUser) {
          if (foundUser) {
            res.send(200);
          } else {
            res.send(401);
          }
        })
        .fail(function (error) {
          next(error);
        });
    }
  }
