'use strict';
const lodash = require('lodash');
const bluebird = require('bluebird').noConflict();

class Utils{}

module.exports = Utils;

Utils._ = lodash;

Utils.Promise = bluebird;

Utils.GeneratorFunction = ((function*(){yield;}).constructor);

/**
 * Check whether if an object is a generator.
 *
 * @param  {Object}  g
 * @return {Boolean}
 */
Utils.isGenerator = function isGenerator (g) {
  return g && {}.toString.call(g) === '[object Generator]' &&
    typeof g.next === 'function' && typeof g.throw === 'function';
};

/**
 * Check whether if a function is generator function.
 *
 * @param  {Function} gfn
 * @return {Boolean}
 */
Utils.isGeneratorFunction = function isGeneratorFunction (gfn) {
  return (gfn instanceof Utils.GeneratorFunction);
};

