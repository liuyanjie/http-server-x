'use strict';
const path = require('path');
const http = require('http');
const https = require('https');
const ewares = require('ewares');
const Emitter = require('events');
const express = require('express');
const co = require('co');

const errors = require('./errors');
const Utils = require('./utils');
const Ctx = require('./ctx');

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
    let opts = this.options = Utils._.defaults(options, defaultOptions);

    this.env = process.env.NODE_ENV || 'development';

    this.app = express();

    this._settings = {};

    this.set('ip', opts.ip);
    this.set('port', opts.port);
  }

  set(setting, v) {
    this._settings[setting] = v;
    return this;
  }

  get(setting) {
    return this._settings[setting];
  }


  loadMiddleware() {
    this._loadDefaultMiddleware();
  }

  _loadDefaultMiddleware() {
    let app = this.app;
    let options = this.options;

    if (options.favicon) {
      let serveFavicon = ewares.get('serveFavicon');
      app.use(serveFavicon());
    }

    if (options.indexes) {
      let serveIndex = ewares.get('serveIndex');
      if (!Array.isArray(options.indexes)){
        options.indexes = [options.indexes];
      }
      for (const index of options.indexes) {
        app.use(serveIndex(index.dir, index.opts));
      }
    }

    if (options.statics) {
      let serveStatic = ewares.get('serveStatic');
      if (!Array.isArray(options.statics)){
        options.statics = [options.statics];
      }
      for (const s of options.statics) {
        app.use(serveStatic(s.dirs, s.options));
      }
    }

    if (options.view) {
      app.set('view engine', options.view.engine);
      let dirs = options.view.dirs;
      if (!Array.isArray(dirs)) {
        dirs = [dirs];
      }
      for (let dir of dirs) {
        if (path.isAbsolute(dir)) {
          app.set('views', dir);
        }
        else {
          app.set('views', path.join(options.root, dir));
        }
      }
    }

    if (options.logging) {
      if (typeof options.logging === 'function') {
        app.use(options.logging);
      }
      else {
        let morgan = ewares.get('morgan');
        app.use(morgan('combined', {}));
      }
    }

    if (options.methodOverride) {
      let methodOverride = ewares.get('methodOverride');
      app.use(methodOverride('X-Http-Method'));
      app.use(methodOverride('X-Http-Method-Override'));
      app.use(methodOverride('X-Method-Override'));
    }

    if (options.responseTime) {
      let responseTime = ewares.get('responseTime');
      app.use(responseTime());
    }

    if (options.timeout) {
      let timeout = ewares.get('connectTimeout');
      app.use(timeout(options.timeout));
    }

    // if (options.partialResponse) {
    //   let partialResponse = ewares.get('expressPartialResponse');
    //   app.use(partialResponse());
    // }

    if (this.env === 'development') {
      let errorHandler = ewares.get('errorHandler');
      app.use(errorHandler());

      let expressDebug = ewares.get('expressDebug');
      expressDebug(app, {});
    }

    if (options.bodyParser) {
      let bodyParser = ewares.get('bodyParser');
      app.use(bodyParser.json({}));
      app.use(bodyParser.urlencoded({extended: false}));
    }

    if (options.cookieParser) {
      let cookieParser = ewares.get('cookieParser');
      app.use(cookieParser());
    }

    if (options.csurf) {
      let csurf = ewares.get('csurf');
      app.use(csurf({
        cookie: true,
        key: '_csurf',
        path: '/',
        ignoreMethods: [],
        sessionKey: 'session'
      }));
    }

    if (options.sessionParser) {
      let sessionParser = ewares.get('expressSession');
      app.use(sessionParser({
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
    this.httpServer = http.createServer(this.app);
  }

  defaultRoute() {
    let defaultRouter = express.Router();
    defaultRouter.get('/server/info', (req, res, next) => {
      this.httpServer.getConnections((err, count) => {
        res.json({
          count: count
        });
      });
    });
    this.app.use(defaultRouter);
  }

  defaultRouter(){
    if (!this._router) {
      this._router = express.Router();
    }
    return this._router;
  }

  use() {
    let router = this.defaultRouter();
    router.use.apply(router, Array.prototype.slice.call(arguments));
  }

  loadRouter(){
    this.app.use(this.defaultRouter());
    let router = this.options.router;
    if (router) {
      this.app.use(router);
    }
  }

  start() {
    this.startTime = Date.now();
    this.defaultRoute();
    this.configure();
    this.loadMiddleware();
    this.loadRouter();
    this.createServer();
    this.httpServer.listen(this.get('port'), this.get('ip'), () => {
      console.log('server start, ', new Date(this.startTime), 'env:', this.env);
    });
  }
}

HttpServer.Router = function () {
  return express.Router();
};

HttpServer.wares = function wares(fns) {
  for (let fn of fns) {
    if (!Utils._.isFunction(fn)) {
      throw new Error(`fn:${fn.name || fn} must be a function, but a ${typeof fn}`);
    }
  }

  let fnsLen = fns.length;
  return (req, res, next) => {
    if (!Array.isArray(fns)) {
      fns = [fns];
    }

    let ctx = new Ctx(req, res, next);

    let count = 0;
    Utils.Promise.each(fns, (fn) => {
      count++;
      if (Utils.isGeneratorFunction(fn)) {
        return co(fn.bind(ctx, ctx));
      }
      else if (fn.length === 3) {
        return Utils.Promise.promisify(fn).bind(ctx)(req, res);
      }
      else if (fn.length === 2) {
        fn.bind(ctx)(req, res);
        let err = new errors.InterruptError(`${fn.name}`);
        return Utils.Promise.reject(err);
      }
      else {
        return fn.bind(ctx, ctx)();
      }
    }).bind(ctx).then(ctx.resp).catch(errors.InterruptError, (err)=>{
      if (count < fnsLen) {
        console.warn(`warn: middware ${err.message} only has two arguments and don't has next arguments`);
      }
    }).catch(ctx.catchException);
  };
};

HttpServer.Utils = Utils;

module.exports = HttpServer;

