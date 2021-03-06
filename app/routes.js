const Game = require('./models/games');
const Performance = require('./models/performance');
const Record = require('./models/record');
const Feedback = require('./models/feedback');
const Optimize = require('./models/optimalteam');
const Import = require('./extract.js');
const Export = require('./excel.js');

const zip = require('express-zip');
const aws = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
const fs = require('graceful-fs-extra');

var temp_dir = path.join(process.cwd(), 'temp/');
if (!fs.existsSync(temp_dir)) fs.mkdirSync(temp_dir);
console.log("temp_dir: "+temp_dir);

var storage = multer.diskStorage({
	destination: function(req,file,cb){
		cb(null,temp_dir);
	},
	filename: function(req,file,cb){
		cb(null,file.originalname+"_"+Date.now()+path.extname(file.originalname));
	}
})

var fileFilter = function(req,file,cb){
	if (path.extname(file.originalname) !== '.StormReplay') {
		req.fileValError.push("Error uploading "+file.originalname+" - Only upload .StormReplay files")
		return cb(null,false) //, new Error("Cannot upload extensions of type: "+path.extname(file.originalname)));
	}
	if (file.mimetype === 'application/octet-stream') {
		cb(null,true);
	}	
}

var upload = multer({storage: storage, fileFilter: fileFilter});


/*var file_path = 'https://s3.amazonaws.com/newmetahots/' //'https://console.aws.amazon.com/s3/home?bucket=newmetahots';

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
*/

module.exports = function(app, passport){
	var heroArray = [];
	var heroesRoster = ["Abathur", "Alarak", "Anub\'arak", "Artanis", "Arthas", "Auriel", "Azmodan", "Brightwing", "Chen", "Cho", "Chromie", "Diablo", "Dehaka", "E.T.C.", "Falstad", "Gall", "Gazlowe", "Greymane", "Gul\'dan", "Illidan", "Jaina", "Johanna", "Kael\'thas", "Kerrigan", "Kharazim", "Leoric", "Li Li", "Li-Ming", "Lt. Morales", "Lunara", "Malfurion", "Medivh",  "Muradin", "Murky", "Nazeebo", "Nova", "Ragnaros", "Raynor", "Rehgar", "Rexxar", "Samuro", "Sgt. Hammer", "Sonya", "Stitches", "Sylvanas", "Tassadar", "The Butcher", "The Lost Vikings", "Thrall", "Tracer", "Tychus", "Tyrael", "Tyrande", "Uther", "Valla", "Varian", "Xul", "Zagara", "Zarya", "Zeratul"];
	
	heroesRoster.map(function(hero){
		//if(!heroArray[hero]){			
			fillPerf(hero,function(data){
				heroArray[hero] = data;
			});					
		//}	
	});

	app.get('/',function(req,res){
		res.render('index.ejs', {uploadSuccess: [], uploadError:[]});//load the index.ejs file
	});

	app.post('/upload', upload.array('stormFiles'), function(req,res,next){
		req.fileValError = [];

		if(!req.files){
			return res.status(403).send("No files selected");
		}
		res.render('index.ejs',{uploadSuccess: req.files, uploadError:req.fileValError});
		//insert heroprotocol parse function here
		Import.extractstuff(temp_dir,heroesRoster);
	})

	app.post('/export',function(req,res){
		Export.toExcel(heroesRoster.slice(0),function(err){
			if(err){
				console.log(err);
			} else {
				console.log("Export.toExcel successful!");
				res.zip([{ path: '../excel/games.xlsx', name: 'Games.xlsx'}, { path: '../excel/performance.xlsx', name: 'Performance.xlsx'}], "NewMetaExport.zip" );		
			}
		}) 
	})

	app.get('/meta',function(req,res){
		res.render('meta.ejs', { heroesRoster: JSON.stringify(heroesRoster) });
	})

	app.get('/feedback',function(req,res){
		res.render('feedback.ejs');
	})

	app.post('/feedback',function(req,res){
		var queryType = req.body.type;		
		if(queryType==="load"){
			Feedback.pastComments(req.body.limitDate).then(function(data){
				console.log("Past comments: "+data);
				res.send(data); // add feedback to current view
			});
		}
		if(queryType==="update"){
			console.log("update runs: "+JSON.stringify(req.body));
			var date_now = Date.now();
			var newFeedback = new Feedback({
				_id: date_now,
				username: req.body.username,
				comments: req.body.comments,
				upvotes: 0
			})
			newFeedback.save();
			res.send(newFeedback);
		}		
	})

	app.post('/meta',function(req,res){
		var queryType = req.body.queryType;		
		if(queryType==="calcStats"){
			var charHov = req.body.charHover;
			return res.send(heroArray[charHov]);//do stuff here
			
		} else if(queryType==="basicStats"){
			var charHov = req.body.charHover;
			fillPerf(charHov, function(data){
				heroArray[charHov] = data;
				return res.send(data);
				
			});	
		} else if("optimalTeam"){
			//console.log(req.body);
			var enemyTeam = JSON.parse(req.body.enemyTeam);
			Optimize.optimalTeam(enemyTeam, function(bestTeamComps){
				return res.send(bestTeamComps);				
			});			
		}			
	});

/*
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
*/
};

function Hero(name,games,wins,winPercent,performance){
	this.name = name;
	this.games = games;
	this.wins = wins;
	this.winPercent = winPercent;
	this.performance = performance;
}

//populate heroArray with the most recent Performance db data
function fillPerf(char,cb){
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