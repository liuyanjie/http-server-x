'use strict';

const HttpServer = require('../lib/index');

let httpServer = new HttpServer({logging: true});

let router = HttpServer.Router();

function fn1(req, res, next) {
  console.log('--------------fn1', typeof next);
  next();
}

function fn2(req, res) {
  console.log('--------------fn2');
  //ctx.body.fn2 = 'pass';
  res.json({v: 'fn2'});
  //return Promise.resolve();
}

function fn3(ctx) {
  console.log('--------------fn3');
  ctx.body.fn2 = 'pass';
  return Promise.resolve();
}

function* gfn1(ctx) {
  console.log('--------------gfn1');
  ctx.body.gfn1 = 'pass';
  var result = yield Promise.resolve(true);
  return result;
}

function* gfn2(ctx) {
  console.log('--------------gfn2');
  ctx.body.gfn2 = 'pass';
  var result = yield Promise.resolve(true);
  return result;
}

function fn3(ctx) {
  console.log('--------------fn3');
  ctx.body.fn3 = 'pass';
}

function fn(req, res, next){
    res.json({value: 1});
}

router.get('/fn', fn);

router.get('/test/wares', HttpServer.wares([fn1, fn2, gfn1, gfn2]));

httpServer.use(router);

httpServer.start();

