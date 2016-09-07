'use strict';
const lodash = require('lodash');
const bluebird = require('bluebird').noConflict();

class Utils {

}

module.exports = Utils;

Utils._ = lodash;

Utils.Promise = bluebird;

Utils.GeneratorFunction = ((function*() {
  yield;
}).constructor);

/**
 * Check whether if an object is a generator.
 *
 * @param  {Object}  g
 * @return {Boolean}
 */
Utils.isGenerator = function isGenerator(g) {
  return g && {}.toString.call(g) === '[object Generator]' &&
    typeof g.next === 'function' && typeof g.throw === 'function';
};

/**
 * Check whether if a function is generator function.
 *
 * @param  {Function} gfn
 * @return {Boolean}
 */
Utils.isGeneratorFunction = function isGeneratorFunction(gfn) {
  return (gfn instanceof Utils.GeneratorFunction);
};

/**
 * wares
 * @param fns
 * @returns {function()}
 */
function wares(fns) {
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
}
