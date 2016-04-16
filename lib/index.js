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

class HttpServer extends Emitter {
  constructor(options) {
    super(options);
    this.init(options);
  }

  init(options){
    let defaultOptions = {
      id: '127.0.0.1',
      port: 12345
    };
    let opts = _.defaults(options, defaultOptions);

    this.env = process.env.NODE_ENV || 'development';
    this.startTime = Date.now();
    this._wares = ewares;
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

    let morgan = this._wares.get('morgan');
    this._app.use(morgan('combined', {}));

    let methodOverride = this._wares.get('methodOverride');
    this._app.use(methodOverride('X-Http-Method'));
    this._app.use(methodOverride('X-Http-Method-Override'));
    this._app.use(methodOverride('X-Method-Override'));

    let responseTime = this._wares.get('responseTime');
    this._app.use(responseTime());

    let bodyParser = this._wares.get('bodyParser');
    this._app.use(bodyParser.json({}));
    this._app.use(bodyParser.urlencoded({extended: false}));

    let cookieParser = this._wares.get('cookieParser');
    this._app.use(cookieParser());

    // let expressSession = this._wares.get('expressSession');
    // this._app.use(expressSession({
    //   name: 'ssid',
    //   proxy: true,
    //   resave: true,
    //   rolling: true,
    //   secret: 'default secret',
    //   unset: 'destroy',
    //   saveUninitialized: true,
    //   cookie: {
    //     maxAge: 1000 * 60 * 60 * 24 * 7,
    //     httpOnly: false,
    //     secret: false,
    //     domain: '',
    //     path: '/'
    //   }
    // }));
  }

  configure() {

  }

  getApp() {
    return this._app;
  }

  createServer() {
    this._server = http.createServer(this.getApp());
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
    this.defaultRoute();
    this.configure();
    this.loadMiddleware();
    this.createServer();
    this.getServer().listen(this.port(), this.ip(), ()=> {
      console.log('server start, ', new Date(this.startTime), 'env:', this.env);
    });
  }
}

HttpServer.Router = function () {
  return express.Router();
};

function isJSON(body) {
  if (!body) return false;
  if ('string' == typeof body) return false;
  if ('function' == typeof body.pipe) return false;
  if (Buffer.isBuffer(body)) return false;
  return true;
}

function isFn(fn) {
  return typeof fn === 'function';
}

var toStr = Object.prototype.toString;
var fnToStr = Function.prototype.toString;
var isFnRegex = /^\s*function\*/;

function isGeneratorFunction(fn) {
  if (typeof fn !== 'function') {
    return false;
  }
  var fnStr = toStr.call(fn);
  return (fnStr === '[object Function]' || fnStr === '[object GeneratorFunction]') && isFnRegex.test(fnToStr.call(fn));
}

function Ctx(req, res, next) {
  this.req = req;
  this.res = res;
  this.next = next;
  this.body = {};
}

function respond() {
  // allow bypassing koa
  // if (false === this.respond) return;
  const res = this.res;

  //   const res = this.res;
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

  // body: json
  body = JSON.stringify(body);
  this.length = Buffer.byteLength(body);
  res.end(body);
}

HttpServer.wares = function wares(fns) {
  for (let fn of fns) {
    if (!isFn(fn)) {
      throw new Error(`fn:${fn.name || fn} must be a function, but a ${typeof fn}`);
    }
  }
  return (req, res, next) => {
    if (!Array.isArray(fns)) {
      fns = [fns];
    }

    let ctx = new Ctx(req, res, next);

    Promise.each(fns, (fn)=> {

      if (fn.length === 3) {
        return Promise.promisify(fn).bind(ctx)(req, res);
      }
      else if (isGeneratorFunction(fn)) {
        return co(fn.bind(ctx));
      }
      else {
        return fn.bind(ctx)();
      }
    }).then(respond.bind(ctx));
  }
};

module.exports = HttpServer;