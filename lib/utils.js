'use strict';
let GeneratorFunction = (function *(){}.constructor);

/**
 * Check whether if an object is a generator.
 *
 * @param  {Object}  g
 * @return {Boolean}
 */
exports.isGenerator = function isGenerator (g) {
  return g && {}.toString.call(g) === '[object Generator]' &&
    typeof g.next === 'function' && typeof g.throw === 'function';
};

/**
 * Check whether if a function is generator function.
 *
 * @param  {Function} gfn
 * @return {Boolean}
 */
exports.isGeneratorFunction = function isGeneratorFunction (gfn) {
  return (gfn instanceof GeneratorFunction);
};
