'use strict';
var proxyquire = require('proxyquire');
var assert = require('assert');
var sinon = require('sinon');

var passport = {};
var dbConnection = {
  query: () => { }
};
var app = {};

var signin = proxyquire('../index', {
  'passport': passport,
})(dbConnection);
var appUseUseSpy;
var appGetGetSpy;

describe('the signin module', () => {
  describe('useLocalLogin', () => {
    beforeEach(() => {
      passport.use = sinon.spy();
      passport.serializeUser = sinon.spy();
      passport.deserializeUser = sinon.spy();
      passport.initialize = sinon.spy();
      passport.session = sinon.spy();
      passport.authenticate = sinon.spy();

      appUseUseSpy = sinon.spy();
      app.use = sinon.stub().returns({
        use: appUseUseSpy
      });
      app.post = sinon.spy();
    });
    afterEach(() => {
      delete passport.use;
      delete passport.serializeUser;
      delete passport.deserializeUser;
      delete passport.initialize;
      delete passport.session;
      delete passport.authenticate;

      delete app.use;
      appUseUseSpy = undefined;
      delete app.post;
    });
    it('should initialise passport with a local strategy', () => {
      signin.useLocalLogin(app);
      assert(passport.use.calledOnce);
    });
    it('should set the serializeUser function', () => {
      signin.useLocalLogin(app);
      assert(passport.serializeUser.calledOnce);
    });
    it('should set the deserializeUser function', () => {
      signin.useLocalLogin(app);
      assert(passport.deserializeUser.calledOnce);
    });
    it('should call app.use', () => {
      signin.useLocalLogin(app);
      assert(app.use.calledOnce);
    });
    it('should call app.use.use', () => {
      signin.useLocalLogin(app);
      assert(appUseUseSpy.calledOnce);
    });
    it('should initialize passport', () => {
      signin.useLocalLogin(app);
      assert(passport.initialize.calledOnce);
    });
    it('should initialize the passport session', () => {
      signin.useLocalLogin(app);
      assert(passport.session.calledOnce);
    });
    it('should set the post route on app', () => {
      signin.useLocalLogin(app);
      assert(app.post.calledOnce);
    });
    it('should set the passport authentication settings', () => {
      signin.useLocalLogin(app);
      assert(passport.authenticate.calledOnce);
    });
  });

  describe('useGoogleLogin', () => {
    beforeEach(() => {
      passport.use = sinon.spy();
      passport.serializeUser = sinon.spy();
      passport.deserializeUser = sinon.spy();
      passport.initialize = sinon.spy();
      passport.session = sinon.spy();
      passport.authenticate = sinon.spy();

      appUseUseSpy = sinon.spy();
      app.use = sinon.stub().returns({
        use: appUseUseSpy
      });
      appGetGetSpy = sinon.spy();
      app.get = sinon.stub().returns({
        get: appGetGetSpy
      });
    });
    afterEach(() => {
      delete passport.use;
      delete passport.serializeUser;
      delete passport.deserializeUser;
      delete passport.initialize;
      delete passport.session;
      delete passport.authenticate;

      delete app.use;
      appUseUseSpy = undefined;
      delete app.get;
      appGetGetSpy = undefined;
    });
    it('should initialize passport with a google strategy', () => {
      signin.useGoogleLogin(app);
      assert(passport.use.calledOnce);
    });
    it('should set the serializeUser function', () => {
      signin.useGoogleLogin(app);
      assert(passport.serializeUser.calledOnce);
    });
    it('should set the deserializeUser function', () => {
      signin.useGoogleLogin(app);
      assert(passport.deserializeUser.calledOnce);
    });
    it('should call app.use', () => {
      signin.useGoogleLogin(app);
      assert(app.use.calledOnce);
    });
    it('should call app.use.use', () => {
      signin.useGoogleLogin(app);
      assert(appUseUseSpy.calledOnce);
    });
    it('should initialize passport', () => {
      signin.useGoogleLogin(app);
      assert(passport.initialize.calledOnce);
    });
    it('should initialize the passport session', () => {
      signin.useGoogleLogin(app);
      assert(passport.session.calledOnce);
    });
    it('should call app.get', () => {
      signin.useGoogleLogin(app);
      assert(app.get.calledOnce);
    });
    it('should call app.get.get', () => {
      signin.useGoogleLogin(app);
      assert(appGetGetSpy.calledOnce);
    });
    it('should set the passport authentication settings', () => {
      signin.useGoogleLogin(app);
      assert(passport.authenticate.calledTwice);
    });
  });
  describe('findUserByEmail', () => {
    describe('for valid emails', () => {
      var result = {
        rows: [{
          id: 1
        }]
      };
      beforeEach(() => {
        sinon.stub(dbConnection, 'query').onCall(0).yields(null, result);
      });
      afterEach(() => {
        dbConnection.query.restore();
      });
      it('should call the callback with the result', (done) => {
        var email = 'foo@bar.com';
        signin.findUserByEmail(email, function(err, user) {
          assert(!err);
          assert(dbConnection.query.calledWith('SELECT id, username, firstName, lastName, email FROM Account WHERE email = $1', [email]));
          assert.equal(result.rows[0], user);
          done();
        });
      });
    });
    describe('for invalid emails', () => {
      var result = {
        rows: []
      };
      beforeEach(() => {
        sinon.stub(dbConnection, 'query').onCall(0).yields(null, result);
      });
      afterEach(() => {
        dbConnection.query.restore();
      });
      it('should call the callback with an error', (done) => {
        var email = 'foo@bar.com';
        signin.findUserByEmail(email, function(err, user) {
          assert(!user);
          assert.equal('email ' + email + ' not found', err);
          assert(dbConnection.query.calledWith('SELECT id, username, firstName, lastName, email FROM Account WHERE email = $1', [email]));
          done();
        });
      });
    });
    describe('for database errors', () => {
      var error = 'unreticulated spline';
      beforeEach(() => {
        sinon.stub(dbConnection, 'query').onCall(0).yields(error);
      });
      afterEach(() => {
        dbConnection.query.restore();
      });
      it('should pass them on', (done) => {
        var email = 'foo@bar.com';
        signin.findUserByEmail(email, function(err, user) {
          assert(!user);
          assert.equal(error, err);
          assert(dbConnection.query.calledWith('SELECT id, username, firstName, lastName, email FROM Account WHERE email = $1', [email]));
          done();
        });
      });
    });
  });
});
