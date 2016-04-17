'use strict';

const HttpServer = require('../lib/index');

let httpServer = new HttpServer({});

let router = HttpServer.Router();

function fn1(req, res, next) {
  console.log('--------------fn1');
  setTimeout(() => {
    this.fn1 = 'pass';
    this.body = {};
    next();
  }, 1);
}

function fn2() {
  console.log('--------------fn2');
  this.body.fn2 = 'pass';
  return Promise.resolve();
}

function* gfn1() {
  console.log('--------------gfn1');
  this.body.gfn1 = 'pass';
  var result = yield Promise.resolve(true);
  return result;
}

function* gfn2() {
  console.log('--------------gfn2');
  this.body.gfn2 = 'pass';
  var result = yield Promise.resolve(true);
  return result;
}

function fn3() {
  console.log('--------------fn3');
  this.body.fn3 = 'pass';
}

function fn(req, res, next){
    res.json({value: 1});
}

router.get('/fn', fn);

router.get('/test/wares', HttpServer.wares([fn1, fn2, gfn1, gfn2, fn3]));

function jsonData() {
  this.body = {
      firstName: 'Mohandas'
    , lastName: 'Gandhi'
    , aliases: [{
          firstName: 'Mahatma'
        , lastName: 'Gandhi'
      }, {
          firstName: 'Bapu'
      }]
  };
}

router.get('/test/wares/data.json', HttpServer.wares([jsonData]));

httpServer.use(router);

// httpServer.configure();

httpServer.start();
