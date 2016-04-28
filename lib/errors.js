'use strict';


class InterruptError extends Error{
  constructor(message){
    super(message);
  }
}

exports.InterruptError = InterruptError;

