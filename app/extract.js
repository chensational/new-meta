//for testing:
//node heroprotocol.js "./replays/Battlefield of Eternity (3).StormReplay" -d

//runs when user uploads .stormreplay files

const fs = require('graceful-fs-extra');
const path = require('path');
const zip = require('express-zip');
const mongoose = require('mongoose');
const heroprotocol = require('heroprotocol');
const Game = require('./models/games');
const Performance = require('./models/performance');
const Record = require('./models/record');
const Export = require('./excel.js');

exports.extractstuff = function(file_path,heroesRoster){
	var numUpserted = 0;
	var numExisting = 0;
	var numError = 0;
	fs.readdir(file_path,function(err,files){
		if(!files){ console.log("No files uploaded")};
		else {
			asyncFor(files,file_path,numExisting,numUpserted,numError,function(res){
			console.log("Number Games Inserted: "+res.numUpserted);
			console.log("Number Games Which Already Exist: "+res.numExisting);
			console.log("Number Games Error: "+res.numError);
			fs.emptyDir(file_path, function (err) {
				if (!err) console.log('Empty Dir: Success!');
				//update Performance - writes to the Performance db
				updatePerformance(heroesRoster.slice(0),heroesRoster.slice(0),function(){
					console.log("updatePerformance was a success!")
					//export stuff into excel files...
					Export.toExcel(heroesRoster.slice(0),function(err){
						if(err){
							console.log("Does this runnnn?");
							console.log(err);
						} else {
							console.log("Export.toExcel successful!");
						}
					})
				});
			})
		});
		}
	});
};

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
			//console.log("serverResponse: "+JSON.stringify(serverResponse));
			//console.log("sortedPerformance: "+sortedPerformance);
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

/* Returns performance stats against every character on the roster in an object
arr = rosterArray
perfQuery = mongoose request query (all games one character was in)
charA = character we want to get performance data on
perf = blank object, will store performance data
perf [ 'Abathur' ] = { games: games,wins: wins,winPercent:winPercent }
cb = callback
*/
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

function asyncFor(fileArray,file_path,numExisting,numUpserted,numError,cb){
	if(fileArray.length<1){
		cb({"numExisting":numExisting, "numUpserted":numUpserted,"numError":numError});
	}
	else {
		var single_file = fileArray.splice(0,1);
		var file = path.resolve(file_path,single_file[0])
		//console.log("file: "+file);
		var initdata = heroprotocol.get(heroprotocol.INITDATA,file);
		var details = heroprotocol.get(heroprotocol.DETAILS,file);
		if(details===undefined){
			console.log("error reading file: "+file);
			numError++;
			asyncFor(fileArray,file_path,numExisting,numUpserted,numError,cb)
		}
		else{
			var map_name = details.m_title;
			var time = details.m_timeUTC;
			var competitive = details.m_heroNoDuplicatesAllowed;
			var bnet_id = details.m_playerList.map(player => { return player.m_toon.m_id });
			var player_name = details.m_playerList.map(player => { return player.m_name });
			var player_hero = details.m_playerList.map(player => { return player.m_hero });
			var team_id = details.m_playerList.map(player => { return player.m_teamId });
			var match_result = details.m_playerList.map(player => { return player.m_result });
			var match_id = initdata.m_syncLobbyState.m_gameDescription.m_randomValue;
			var playerInfo = [];
			for(n=0;n<bnet_id.length;n++){
				playerInfo[n] = {
					bnet_id: bnet_id[n],
					player_name: player_name[n],
					player_hero: player_hero[n],
					team_id: team_id[n],
					match_result: match_result[n]
				}
			}
			var match = { 
				_id: match_id, 
				map_name: map_name,
				time: time, 
				competitive:competitive, 
				playerInfo: playerInfo
			}

			Game.update({"_id":match_id},match,{upsert:true},function(err,stuff){
				if(!err) { 
					if(stuff.nModified===1){
						numExisting++;
					}
					if(stuff.hasOwnProperty("upserted")){
						numUpserted++;
					}
					asyncFor(fileArray,file_path,numExisting,numUpserted,numError,cb);
				};
			})
		}					
	}	
}