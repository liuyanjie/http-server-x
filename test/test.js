/**
 * Created by admin on 2016/4/16.
 */
const express = require('express');
const ewares = require('ewares');

var app = express();

app.listen(54321);

var methodOverride = ewares.get('methodOverride');
app.use(methodOverride('X-Http-Method'));
app.use(methodOverride('X-Http-Method-Override'));
app.use(methodOverride('X-Method-Override'));

var cookieParser = ewares.get('cookieParser');
app.use(cookieParser());

var expressSession = ewares.get('expressSession');
app.use(expressSession({
  name: 'ssid',
  proxy: true,
  resave: true,
  rolling: true,
  secret: 'default secret',
  unset: 'destroy',
  saveUninitialized: true,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7,
    httpOnly: false,
    secret: false,
    domain: '',
    path: '/'
  }
}));
