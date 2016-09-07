'use strict';

class Router {
  constructor(path) {
    this._path = path;
  }
}

Router.route = function (path) {
  return new Router(path);
};
