'use strict';

const HttpServer = require('../lib/http_server');

let hsx = new HttpServer({
  timeout: 200,
  logging: true
});

hsx.route('/').get(function*(sess) => {

});
hsx.route('/users').get((sess) => {});
hsx.route('/users/:uid/message').get((sess) => {});
hsx.route('/users/:uid/message/at').get((sess) => {});
hsx.route('/users/:uid/message/favor').get((sess) => {});
hsx.route('/users/:uid/message/comment').get((sess) => {});
