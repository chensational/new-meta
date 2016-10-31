var Game = require('./models/games');
var Performance = require('./models/performance');
var Record = require('./models/record');
var Optimize = require('./models/optimalteam');
var ExtractReplays = require('./extract.js');
var multer = require('multer');
var path = require('path');
var file_path = './replays/';

var storage = multer.diskStorage({
	destination: function(req,file,cb){
		cb(null,'../meta-passport/replays');
	},
	filename: function(req,file,cb){
		//console.log(file);
		cb(null,file.originalname+"_"+Date.now()+"."+path.extname(file.originalname));
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

var upload = multer({storage: storage, fileFilter: fileFilter}).array('sampleFile',9999);

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

	app.post('/upload',function(req,res){
		req.fileValError = [];
		upload(req,res, function(err){	
			if(err){
				console.log('Error Occured');
				return;
			}			
			res.render('index.ejs',{uploadSuccess: req.files, uploadError:req.fileValError});
			//insert heroprotocol parse function here
			ExtractReplays.extractstuff(file_path,heroesRoster);
		})

	});

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

/* COPYING TO EXTRACT.JS - can delete if everything works okay...
//intent of this function is to refresh Performance db with most 
//up to date data when you know new data is loaded into the server
function updatePerformance(rosterArray,heroesRoster,callback){
	if(rosterArray.length<1){		
		callback();
	}else{
		var arrayVal = rosterArray.splice(0,1);	
		loadStats(arrayVal,heroesRoster,function(serverResponse){
			var sortPerformance = [];
			var perfArray = [];

			for(hero in serverResponse.performance){//perf['abathur'] = {games,wins,winPerc} [(0) hero,(1) games,(2) wins,(3) winPercent]
				sortPerformance.push([hero,serverResponse.performance[hero].games,serverResponse.performance[hero].wins,serverResponse.performance[hero].winPercent])
			}
			// [[(0) hero,(1) games,(2) wins,(3) winPercent],[hero,games,wins,winPerc],[...],etc.
			var sortedPerformance = sortPerformance.sort(function(a,b){ return b[3] - a[3]});

			for(n=0;n<sortedPerformance.length;n++){
				if(!sortedPerformance[n][3]){
					var winP = 0;
				}else{
					winP = sortedPerformance[n][3];
				}			
				perfArray[n] = {
					p_name: sortedPerformance[n][0],
					p_games: sortedPerformance[n][1],
					p_wins: sortedPerformance[n][2],
					p_winPercent: winP
				}
			}
			
			var savePerf = new Performance({
				_id: Date.now(),
				char_name: arrayVal,
				games: serverResponse.games,
				wins: serverResponse.wins,
				winPercent: serverResponse.winPercent,
				performance: perfArray
			})

			savePerf.save(function(err,perf){
				if(err) return console.error(err);
				updatePerformance(rosterArray,heroesRoster,callback);
			})
		})
	}
}


//takes one char and loads it's overall win percentage and 
//it's performance against all other characters on the roster
//returns that info to a callback
function loadStats(char,rosterArray,callback){
	var gQuery = Game.findByHero(char); //returns player_info documents
	var pQuery = Game.fBHReturnGames(char); //returns game documents
	var p = {};
	var games, wins, winPercent;
	gQuery.find(function(err,gTotal){
		games = gTotal.length;
		Game.findHeroWins(this,char,function(err,gWins){ //returns all player_infodocuments where the char won
			if(err) throw err;
			wins = gWins.length;
			winPercent = Math.round((wins/games)*100);
			asyncMap(char,rosterArray.slice(0),pQuery,p,function(data){
				var statResult = {
					wins: wins,
					games: games,
					winPercent: winPercent,
					performance: data
				};
				callback(statResult);
			});			
		});
	});	
}
*/
/* Returns performance stats against every character on the roster in an object
arr = rosterArray
perfQuery = mongoose request query (all games one character was in)
charA = character we want to get performance data on
perf = blank object, will store performance data
perf [ 'Abathur' ] = { games: games,wins: wins,winPercent:winPercent }
cb = callback
*/
/*
function asyncMap(charA,arr,pQuery,perf,cb){
	if(arr.length<1){
		//console.log("JSON.stringify(perf) "+JSON.stringify(perf));
		cb(perf); 
	}else{
		var arrayVal = arr.splice(0,1);
		pQuery.count({ $and: [ //find games where character A is on team 1 and character B is on team 2
			{playerInfo: { $elemMatch: { player_hero: charA, team_id: 0}}},
			{playerInfo: { $elemMatch: { player_hero: arrayVal, team_id: 1}}} ]},
		function(err,gamesA){ // find more games where character A is on team 2 and character B is on team 1
			pQuery.count({ $and: [
			{playerInfo: { $elemMatch: { player_hero: charA, team_id: 1}}},
			{playerInfo: { $elemMatch: { player_hero: arrayVal, team_id: 0}}} ]},
		function(err,gamesB){ // find wins
			pQuery.count({ $and: [ 
			{playerInfo: { $elemMatch: { player_hero: charA, team_id: 0, match_result: 1}}},
			{playerInfo: { $elemMatch: { player_hero: arrayVal, team_id: 1}}} ]},
		function(err,winsA){ // find more wins
			pQuery.count({ $and: [
			{playerInfo: { $elemMatch: { player_hero: charA, team_id: 1, match_result: 1}}},
			{playerInfo: { $elemMatch: { player_hero: arrayVal, team_id: 0}}} ]},
		function(err,winsB){
			var games = gamesA+gamesB;
			var wins = winsA+winsB;
			var winPercent = Math.round((wins/games)*100); 
			//perf['Abathur'] = {games,wins,winPercent}
			perf[arrayVal] = {
				games: games,
				wins: wins,
				winPercent: winPercent
			}
			asyncMap(charA,arr,pQuery,perf,cb);
		})})})});
	};
}; 
*/

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