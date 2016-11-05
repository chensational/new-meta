var Game = require('./models/games');
var Performance = require('./models/performance');
var Record = require('./models/record');
var Optimize = require('./models/optimalteam');
var ExtractReplays = require('./extract.js');
var zip = require('express-zip');
var aws = require('aws-sdk');
var multer = require('multer');
var multerS3 = require('multer-s3');
var path = require('path');
var fs = require('graceful-fs-extra');

aws.config = new aws.Config();
aws.config.update({
	accessKeyId: process.env.AWS_ACCESS_KEY_ID,
	secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
}) 

var s3 = new aws.S3(); 

var fileFilter = function(req,file,cb){
	if (path.extname(file.originalname) !== '.StormReplay') {
		if(!req.fileValError){
			req.fileValError = [];
		}
		req.fileValError.push("Error uploading "+file.originalname+" - Only upload .StormReplay files")
		return cb(null,false) //, new Error("Cannot upload extensions of type: "+path.extname(file.originalname)));
	}
	if (file.mimetype === 'application/octet-stream') {
		cb(null,true);
	}	
}

var upload = multer({
	storage: multerS3({
		s3: s3,
		bucket: 'newmetahots',
		accessKeyId: process.env.AWS_ACCESS_KEY_ID,
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
		region: 'us-east-1',
		metadata: function(req,file,cb){
			cb(null, Object.assign({}, req.body));
		},
		key: function(req,file,cb){
			cb(null, Date.now().toString()+path.extname(file.originalname))
		}
	}),
	fileFilter: fileFilter
}) 

module.exports = function(app, passport){
	var heroArray = [];
	var heroesRoster = ["Abathur","Anub\'arak", "Artanis", "Arthas", "Azmodan", "Brightwing", "Chen", "Cho", "Diablo", "E.T.C.", "Falstad", "Gall", "Gazlowe", "Greymane", "Illidan", "Jaina", "Johanna", "Kael\'thas", "Kerrigan", "Kharazim", "Leoric", "Li Li", "Li-Ming", "Lt. Morales", "Lunara", "Malfurion", "Muradin", "Murky", "Nazeebo", "Nova", "Raynor", "Rehgar", "Rexxar", "Sgt. Hammer", "Sonya", "Stitches", "Sylvanas", "Tassadar", "The Butcher", "The Lost Vikings", "Thrall", "Tychus", "Tyrael", "Tyrande", "Uther", "Valla", "Xul", "Zagara", "Zeratul"];
	
	heroesRoster.map(function(hero){
		if(!heroArray[hero]){			
			calcStats(hero,function(data){
				heroArray[hero] = data;
			});					
		}	
	});

	app.get('/',function(req,res){
		res.render('index.ejs', {uploadSuccess: [], uploadError:[]});//load the index.ejs file
	});

	app.post('/upload', upload.array('stormFiles'), function(req,res,next){
		req.fileValError = [];

		if(!req.files){
			return res.status(403).send("No files selectd");
		}
		res.render('index.ejs',{uploadSuccess: req.files, uploadError:req.fileValError});
		//insert heroprotocol parse function here
		ExtractReplays.extractstuff(file_path,heroesRoster);
	})

	app.post('/export',function(req,res){
		res.zip([
			{ path: '../meta-passport/excel/games.xlsx', name: 'Games.xlsx'},
			{ path: '../meta-passport/excel/performance.xlsx', name: 'Performance.xlsx'}
			], "NewMetaExport.zip" );		
	})

	app.get('/meta',function(req,res){
		res.render('meta.ejs', { heroesRoster: JSON.stringify(heroesRoster) });
	})

	app.post('/meta',function(req,res){
		var queryType = req.body.queryType;
		
		if(queryType==="calcStats"){
			var charHov = req.body.charHover;
			res.send(heroArray[charHov]);//do stuff here
		};
		
		if(queryType==="basicStats"){
			var charHov = req.body.charHover;
			calcStats(charHov, function(data){
				heroArray[charHov] = data;
				res.send(data);
			});	
		};

		if(queryType==='optimalTeam'){
			//console.log(req.body);
			var enemyTeam = JSON.parse(req.body.enemyTeam);
			Optimize.optimalTeam(enemyTeam, function(bestTeamComps){
				console.log("DOES THIS HAPPEN?");
				res.send(bestTeamComps);
			});			
		}			
	});

	app.get('/login',function(req,res){
		res.render('login.ejs', { message: req.flash('loginMessage') });
	});

	app.get('/signup', function(req,res){
		res.render('signup.ejs', { message: req.flash('signupMessage')});
	});

	//process the signup form
	app.post('/signup',passport.authenticate('local-signup',{
		successRedirect : '/profile', // redirect to the secure profile section
		failureRedirect : '/signup', // redirect back to the signup page if there is an error
		failureFlash : true // allow flash messages
	}));

	app.post('/login', passport.authenticate('local-login', {
		successRedirect : '/profile', // redirect to the secure profile section
		failureRedirect : '/login', //redirect back to signup page if there is an error
		failureFlash : true // allow flash messages
	}));

	app.get('/profile', isLoggedIn, function(req,res){
		res.render('profile.ejs', {
			user: req.user // get the user out of session and pass to template
		});
	});

	app.get('/logout', function(req,res) {
		req.logout();
		res.redirect('/');
	});
};

function Hero(name,games,wins,winPercent,performance){
	this.name = name;
	this.games = games;
	this.wins = wins;
	this.winPercent = winPercent;
	this.performance = performance;
}

//intent of this function is to populate heroArray in this app 
//with the most recent Performance db data
function calcStats(char,cb){
	var pQueryStream = Performance.basicStats(char).
		sort({_id: -1}).limit(1).stream();
	pQueryStream.on('data',function(data){		
		var charStats = new Hero(data.char_name,data.games,data.wins,data.winPercent,data.performance);
		cb(charStats);
	})
}

function isLoggedIn(req,res,next){
	if (req.isAuthenticated()) 
		return next(); //if user is authenticated in the session then carry on
	res.redirect('/'); //if not, then redirect to home page
}

function intersects(keyArr,searchArr){
	return keyArr.filter(function(n){
		return searchArr.indexOf(n) != -1;
	})
}