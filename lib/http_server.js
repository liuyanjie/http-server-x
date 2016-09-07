'use strict';
const path = require('path');
const http = require('http');
const https = require('https');
const Emitter = require('events');

const Session = require('./session');
const Router = require('./router');
const Utils = require('./utils');
const Errors = require('./errors');

/**
 * HttpServer
 */
class HttpServer extends Emitter {
  constructor(options) {
    super();
    this._server = http.createServer();

    this._server.on('request', function (req, res) {
      let sess = new Session(req, res);
    });

    this._router = new Router();

    this._settings = {};
  }

  set(setting, v) {
    this._settings[setting] = v;
    return this;
  }

  get(setting) {
    return this._settings[setting];
  }

  listen(port, ip) {
    this._server.listen(port, ip);
  }

  route(path) {
    return this._router.route(path);
  }
}

HttpServer.Utils = Utils;

module.exports = HttpServer;