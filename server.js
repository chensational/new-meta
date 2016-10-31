
// gotta setup pre-requisite requirements
var express = require('express');
var app = express();
var port = process.env.PORT || 8080;
var mongoose = require('mongoose');
var passport = require('passport');
var flash = require('connect-flash');
var multer = require('multer');

var morgan = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');

var configDB = require('./config/database.js');

mongoose.createConnection(configDB.url); //connect to our database

require('./config/passport')(passport); //pass passport object for configuration

// set up express
app.use(express.static('public'));
app.use(morgan('dev')); //log every request to the console
app.use(cookieParser()); //read cookies (needed for auth)
//app.use(bodyParser()); // get information from html forms
app.use(bodyParser.json()); //support json encoded bodies
app.use(bodyParser.urlencoded({extended: false })); //support encoded bodies

app.set('view engine','ejs'); //set up ejs for templating

// required express setup for passport
app.use(session({secret: 'meow'}));
app.use(passport.initialize());
app.use(passport.session()); //persistent login sessions
app.use(flash()); //use connect-flash for flash messages stored in session

// routes
require('./app/routes.js')(app,passport); //load our routes and pass in our app and fully configured passport

//launch
app.listen(port);
console.log('The magic happens on port ' + port);