'use strict';

const HttpServer = require('../lib/http_server');

let hsx = new HttpServer({
  timeout: 200,
  logging: true
});

hsx.route('/').get(function*(sess) => {

});

hsx.route('/users').get((sess) => {});
hsx.route('/users/${userId:number}/msg').get((sess) => {});
hsx.route('/users/${userId:number}/msg/at').get((sess) => {});
hsx.route('/users/${userId:number}/msg/favor').get((sess) => {});
hsx.route('/users/${userId:number}/msg/comment').get((sess) => {});

class HttpServerX extends HttpServer {
  constructor() {
    super.get();
  }
}
