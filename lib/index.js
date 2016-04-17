'use strict';
const http = require('http');
const https = require('https');
const Stream = require('stream');
const ewares = require('ewares');
const statuses = require('statuses');
const express = require('express');
const Promise = require('bluebird');
const Emitter = require('events');
const co = require('co');
const _ = require('lodash');
const utils = require('./utils');

/**
 * HttpServer
 * @param {Object}  options
 * @param {String}  [options.ip='127.0.0.1']
 * @param {Number}  [options.port=12345]
 * @param {String}  [options.env=process.env.NODE_ENV||'development']
 * @param {Boolean} [options.methodOverride=true]
 * @param {Boolean} [options.responseTime=true]
 * @param {Boolean} [options.connectTimeout=true]
 * @param {Boolean} [options.partialResponse=true]
 * @param {Boolean} [options.bodyParser=true]
 * @param {Boolean} [options.cookieParser=true]
 * @param {Boolean} [options.sessionParser=true]
 * @param {Boolean} [options.csurf=true]
 */
class HttpServer extends Emitter {

  constructor(options) {
    super();
    this.init(options);
  }

  init(options) {
    let defaultOptions = {
      ip: '127.0.0.1',
      port: 12345,
      methodOverride: true,
      responseTime: true,
      connectTimeout: '10s'
    };
    let opts = this.options = _.defaults(options, defaultOptions);

    this.env = process.env.NODE_ENV || 'development';

    this._app = express();
    this._ip = opts.ip;
    this._port = opts.port;
  }

  ip() {
    return this._ip;
  }

  port() {
    return this._port;
  }

  loadMiddleware() {
    this._loadDefaultMiddleware();
  }

  _loadDefaultMiddleware() {
    let options = this.options;

    if (options.logging) {
      let morgan = ewares.get('morgan');
      this._app.use(morgan('combined', {}));
    }

    if (options.methodOverride) {
      let methodOverride = ewares.get('methodOverride');
      this._app.use(methodOverride('X-Http-Method'));
      this._app.use(methodOverride('X-Http-Method-Override'));
      this._app.use(methodOverride('X-Method-Override'));
    }

    if (options.responseTime) {
      let responseTime = ewares.get('responseTime');
      this._app.use(responseTime());
    }

    if (options.timeout) {
      let timeout = ewares.get('connectTimeout');
      this._app.use(timeout(options.timeout));
    }

    // if (options.partialResponse) {
    //   let partialResponse = ewares.get('expressPartialResponse');
    //   this._app.use(partialResponse());
    // }

    if (this.env === 'development') {
      let errorHandler = ewares.get('errorHandler');
      this._app.use(errorHandler());

      let expressDebug = ewares.get('expressDebug');
      expressDebug(this._app, {});
    }

    if (options.bodyParser) {
      let bodyParser = ewares.get('bodyParser');
      this._app.use(bodyParser.json({}));
      this._app.use(bodyParser.urlencoded({extended: false}));
    }

    if (options.cookieParser) {
      let cookieParser = ewares.get('cookieParser');
      this._app.use(cookieParser());
    }

    if (options.csurf) {
      let csurf = ewares.get('csurf');
      this._app.use(csurf({
        cookie: true,
        key: '_csurf',
        path: '/',
        ignoreMethods: [],
        sessionKey: 'session'
      }));
    }

    if (options.sessionParser) {
      let sessionParser = ewares.get('expressSession');
      this._app.use(sessionParser({
        name: 'ssid',
        proxy: true,
        resave: true,
        rolling: true,
        secret: 'default secret',
        unset: 'destroy',
        saveUninitialized: true,
        cookie: {
          maxAge: 1000 * 60 * 60 * 24 * 7,
          httpOnly: false,
          secret: false,
          domain: '',
          path: '/'
        }
      }));
    }
  }

  configure() {

  }

  createServer() {
    this._server = http.createServer(this.getApp());
  }

  getApp() {
    return this._app;
  }

  getServer() {
    return this._server;
  }

  defaultRoute() {
    let defaultRouter = express.Router();
    defaultRouter.get('/server/info', (req, res, next) => {
      this._server.getConnections((err, count) => {
        res.json({
          count: count
        });
      });
    });
    this.getApp().use(defaultRouter);
  }

  use() {
    return this._app.use.apply(this._app, Array.prototype.slice.call(arguments));
  }

  start() {
    this.startTime = Date.now();
    this.defaultRoute();
    this.configure();
    this.loadMiddleware();
    this.createServer();
    this.getServer().listen(this.port(), this.ip(), () => {
      console.log('server start, ', new Date(this.startTime), 'env:', this.env);
    });
  }
}

HttpServer.Router = function () {
  return express.Router();
};

function Ctx(req, res, next) {
  this.req = req;
  this.res = res;
  this.next = next;
  this.body = {};
}

function isJSON(body) {
  return (!body || 'string' == typeof body || 'function' == typeof body.pipe || Buffer.isBuffer(body));
}

function respond() {
  // if (false === this.respond) return;
  const req = this.req;
  const res = this.res;

  //   if (res.headersSent || !this.writable) return;

  let body = this.body;
  const code = this.status;

  // ignore body
  if (statuses.empty[code]) {
    // strip headers
    this.body = null;
    return res.end();
  }

  if ('HEAD' == this.method) {
    if (isJSON(body)) this.length = Buffer.byteLength(JSON.stringify(body));
    return res.end();
  }

  // status body
  if (null == body) {
    this.type = 'text';
    body = this.message || String(code);
    this.length = Buffer.byteLength(body);
    return res.end(body);
  }

  // responses
  if (Buffer.isBuffer(body)) return res.end(body);
  if ('string' == typeof body) return res.end(body);
  if (body instanceof Stream) return body.pipe(res);
  if (isJSON(body)) return res.json(body);

  // body: json
  body = JSON.stringify(body);
  this.length = Buffer.byteLength(body);
  res.end(body);
}

function catchException(err) {
  this.res.json(err.stack);
}

HttpServer.wares = function wares(fns) {
  for (let fn of fns) {
    if (!_.isFunction(fn)) {
      throw new Error(`fn:${fn.name || fn} must be a function, but a ${typeof fn}`);
    }
  }

  return (req, res, next) => {
    if (!Array.isArray(fns)) {
      fns = [fns];
    }

    let ctx = new Ctx(req, res, next);

    Promise.each(fns, (fn) => {
      if (fn.length === 2 && fn.length === 3) {
        return Promise.promisify(fn).bind(ctx)(req, res);
      }
      else if (utils.isGeneratorFunction(fn)) {
        return co(fn.bind(ctx));
      }
      else {
        return fn.bind(ctx)();
      }
    }).bind(ctx).then(respond).catch(catchException);
  }
};

module.exports = HttpServer;