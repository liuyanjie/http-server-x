'use strict';
const Stream = require('stream');
const statuses = require('statuses');

/**
 * isJSON
 */
const isJSON = function(body) {
  return (!body || 'string' === typeof body || 'function' === typeof body.pipe || Buffer.isBuffer(body));
};

/**
 * Context
 */
class Context{
  constructor(req, res, next) {
    this.req = req;
    this.res = res;
    this.next = next;
    this.body = {};
  }
}

/**
 * resp
 */
Context.prototype.resp = function () {
  console.log();
  console.log();
  // if (false === this.respond) return;
  const req = this.req;
  const res = this.res;

  //   if (res.headersSent || !this.writable) return;

  let body = this.body;
  const code = this.status;

  // ignore body
  if (statuses.empty[code]) {
    // strip headers
    this.body = null;
    return res.end();
  }

  if ('HEAD' === this.method) {
    if (isJSON(body)) {this.length = Buffer.byteLength(JSON.stringify(body));}
    return res.end();
  }

  // status body
  if (null === body) {
    this.type = 'text';
    body = this.message || String(code);
    this.length = Buffer.byteLength(body);
    return res.end(body);
  }

  // responses
  if (Buffer.isBuffer(body)) {return res.end(body);}
  if ('string' === typeof body) {return res.end(body);}
  if (body instanceof Stream) {return body.pipe(res);}
  if (isJSON(body)) {return res.json(body);}

  // body: json
  body = JSON.stringify(body);
  this.length = Buffer.byteLength(body);
  res.end(body);
};

/**
 * catchException
 */
Context.prototype.catchException = function (err) {
  console.error(err);
  this.res.json(err.stack);
};

module.exports = Context;

