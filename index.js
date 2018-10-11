'use strict';
const SIGNIN_ERROR = 'drugisSigninError';
var bcrypt = require('bcrypt');
var passport = require('passport');

module.exports = function(dbConnection, appEnvironmentSettings) {
  function useLocalLogin(app) {
    passport.use(createLocalStrategy());
    initializePassport(app);
    app
      .post('/login',
        passport.authenticate('local', {
          successRedirect: '/',
          failureRedirect: '/'
        })
      );
  }

  function createLocalStrategy() {
    var LocalStrategy = require('passport-local').Strategy;
    return new LocalStrategy(findAndValidateUser);
  }

  function findAndValidateUser(username, password, callback) {
    findUserByUsername(username, function(error, user) {
      if (error) { return callback(error); }
      if (!isValidPassword(password, user.password)) {
        return callback({
          type: SIGNIN_ERROR,
          message: 'Invalid password'
        });
      }
      return callback(null, user);
    });
  }

  function useGoogleLogin(app) {
    passport.use(createGoogleStrategy());
    initializePassport(app);
    app
      .get('/auth/google/', passport.authenticate('google', { scope: ['profile', 'email'] }))
      .get('/auth/google/callback', passport.authenticate('google', {
        failureRedirect: '/',
        successRedirect: '/',
      }));
  }

  function createGoogleStrategy() {
    var GoogleStrategy = require('passport-google-oauth20').Strategy;
    return new GoogleStrategy({
      clientID: appEnvironmentSettings.googleKey,
      clientSecret: appEnvironmentSettings.googleSecret,
      callbackURL: appEnvironmentSettings.host + '/auth/google/callback'
    },
      findOrCreateUser
    );
  }

  function initializePassport(app) {
    passport.serializeUser(function(user, cb) {
      cb(null, user);
    });
    passport.deserializeUser(function(obj, cb) {
      cb(null, obj);
    });
    app
      .use(passport.initialize())
      .use(passport.session());
  }

  function findOrCreateUser(accessToken, refreshToken, googleUser, callback) {
    dbConnection.runInTransaction(userTransaction, function(error, result) {
      if (error) {
        return callback(error);
      }
      callback(null, result);
    });

    function userTransaction(client, callback) {
      client.query(
        'SELECT id, username, firstName, lastName FROM Account WHERE account.username = $1 OR account.email = $2',
        [googleUser.id, googleUser.emails[0].value],
        function(error, result) {
          if (error) { return callback(error); }

          var defaultPicture = appEnvironmentSettings.host + '/public/images/defaultUser.png';
          if (result.rows.length === 0) {
            createAccount(client, googleUser, defaultPicture, callback);
          } else {
            var user = result.rows[0];
            user.userPicture = googleUser.photos[0] ? googleUser.photos[0].value : defaultPicture;
            callback(null, user);
          }
        }
      );
    }
  }

  function createAccount(client, googleUser, defaultPicture, callback) {
    client.query(
      'INSERT INTO Account (username, firstName, lastName) VALUES ($1, $2, $3) RETURNING id',
      [googleUser.id, googleUser.name.givenName, googleUser.name.familyName],
      function(error, result) {
        if (error) {
          return callback(error);
        }
        var row = result.rows[0];
        return callback(null, {
          id: row.id,
          username: googleUser.id,
          firstname: googleUser.name.givenName,
          lastname: googleUser.name.familyName,
          userPicture: googleUser.photos[0] ? googleUser.photos[0].value : defaultPicture
        });
      });
  }

  function findUserByEmail(email, callback) {
    findUserByProperty('email', email, callback);
  }

  function findUserByUsername(username, callback) {
    dbConnection.query('SELECT id, username, firstName, lastName, password FROM Account WHERE username = $1',
      [username], function(error, result) {
        if (error) {
          callback(error);
        } else if (result.rows.length === 0) {
          callback({
            type: SIGNIN_ERROR,
            message: 'username ' + username + ' not found'
          });
        } else {
          callback(null, result.rows[0]);
        }
      });
  }

  function isValidPassword(password, hash) {
    return bcrypt.compareSync(password, hash);
  }

  function findUserByProperty(property, value, callback) {
    dbConnection.query('SELECT id, username, firstName, lastName, email FROM Account WHERE ' + property + ' = $1',
      [value], function(error, result) {
        if (error) {
          callback(error);
        } else if (result.rows.length === 0) {
          callback(property + ' ' + value + ' not found');
        } else {
          callback(null, result.rows[0]);
        }
      });
  }

  return {
    SIGNIN_ERROR: SIGNIN_ERROR,
    findUserByEmail: findUserByEmail,
    useLocalLogin: useLocalLogin,
    useGoogleLogin: useGoogleLogin
  };
};
