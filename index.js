'use strict';
const SIGNIN_ERROR = 'drugisSigninError';
module.exports = function(db) {
  var bcrypt = require('bcrypt');
  var passport = require('passport');

  function useLocalLogin(app) {
    var LocalStrategy = require('passport-local').Strategy;
    passport.use(new LocalStrategy(
      function(username, password, callback) {
        findUserByUsername(username, function(error, user) {
          if (error) { return callback(error); }
          if (!isValidPassword(password, user.password)) {
            return callback({
              type: 'loginError',
              message: 'Invalid password'
            });
          }
          return callback(null, user);
        });
      })
    );
    initializePassport(app);
    app
      .post('/login',
        passport.authenticate('local', {
          successRedirect: '/',
          failureRedirect: '/'
        })
      );
  }
  
  function useGoogleLogin(app) {
    var GoogleStrategy = require('passport-google-oauth20').Strategy;
    passport.use(new GoogleStrategy({
      clientID: process.env.MCDAWEB_GOOGLE_KEY,
      clientSecret: process.env.MCDAWEB_GOOGLE_SECRET,
      callbackURL: process.env.MCDA_HOST + '/auth/google/callback'
    },
      findOrCreateUser
    ));
    initializePassport(app);
    app
      .get('/auth/google/', passport.authenticate('google', { scope: ['profile', 'email'] }))
      .get('/auth/google/callback', passport.authenticate('google', {
        failureRedirect: '/',
        successRedirect: '/',
      }));
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
    db.runInTransaction(userTransaction, function(error, result) {
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
          
          var defaultPicture = process.env.MCDA_HOST + '/public/images/defaultUser.png';
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

  function findUserById(id, callback) {
    findUserByProperty('id', id, callback);
  }

  function findUserByEmail(email, callback) {
    findUserByProperty('email', email, callback);
  }

  function findUserByUsername(username, callback) {
    db.query('SELECT id, username, firstName, lastName, password FROM Account WHERE username = $1',
      [username], function(error, result) {
        if (error) {
          callback(error);
        } else if (result.rows.length === 0) {
          callback({
            type: 'loginError',
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
    db.query('SELECT id, username, firstName, lastName, email FROM Account WHERE ' + property + ' = $1',
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
    findOrCreateUser: findOrCreateUser,
    findUserById: findUserById,
    findUserByEmail: findUserByEmail,
    findUserByUsername: findUserByUsername,
    isValidPassword: isValidPassword,
    useLocalLogin: useLocalLogin,
    useGoogleLogin: useGoogleLogin
  };
};
