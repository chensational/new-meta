//git add .
//git commit -m "<Notes about update here>"
//git push heroku master

//heroku local web

// gotta setup pre-requisite requirements
var express = require('express');
var app = express();
var port = process.env.PORT || 5000;
var mongoose = require('mongoose');
var passport = require('passport');
var flash = require('connect-flash');
var multer = require('multer');

var morgan = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');

// set up express
app.use(express.static('public'));
app.use(morgan('dev')); //log every request to the console
app.use(cookieParser()); //read cookies (needed for auth)
app.use(bodyParser.json()); //support json encoded bodies
app.use(bodyParser.urlencoded({extended: false })); //support encoded bodies
app.set('view engine','ejs'); //set up ejs for templating

// required express setup for passport
app.use(session({secret: 'meow'}));
app.use(passport.initialize());
app.use(passport.session()); //persistent login sessions
app.use(flash()); //use connect-flash for flash messages stored in session
require('./config/passport')(passport); //pass passport object for configuration

//setup mongo database connection
var configDB = process.env.MONGODB_URI;
var options = { server: { socketOptions: { keepAlive: 300000, connectTimeoutMS: 3000}}, 
				replset: { socketOptions: { keepAlive: 300000, connectTimeoutMS: 3000 } } };

mongoose.connect(configDB, options, function(err,res){
	if (err) {
      console.log ('ERROR connecting to: ' + configDB + '. ' + err);
    } else {
      console.log ('Succeeded connected to: ' + configDB);
    }
}); //connect to our database

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open',function(){
	var Game = require('./app/models/games');
	var Performance = require('./app/models/performance');
	var Record = require('./app/models/record');

	console.log("connected to collections!")
	//routes
	require('./app/routes.js')(app,passport); //load our routes and pass in our app and fully configured passport

})


//launch
app.listen(port);
console.log('The magic happens on port ' + port);