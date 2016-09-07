'use strict';

const Request = require('./request');
const Response = require('./response');

class Session {
  constructor(req, res) {
    super();
    this.req = new Request(req);
    this.res = new Response(res);
  }
}
