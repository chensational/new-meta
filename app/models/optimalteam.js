//restarting mongodb locally:
//netstat -anbo
//taskkill /f /pid 2648
//mongod.exe --dbpath c:\mongodb\data\db

var mongoose = require('mongoose');
var Game = require('./games');
var Performance = require('./performance');
var Record = require('./record');
var Optimize = require('./optimalteam');

module.exports.optimalTeam = function(arr,callback){
	//console.log(arr);
	optimalTeam1(arr, function(next){
		console.log("OPTIMALTEAM 1 COMPLETE");
		optimalTeam2(arr, function(merp){
			console.log("OPTIMALTEAM 2 COMPLETE");
			Optimize.sortOptimal(arr,callback);
		});
	})
};

module.exports.sortOptimal = function(arr,cb){
	Record.aggregate([
		{"$match": { "search": arr.join()}},
		{"$unwind": "$results"},
		{"$sort": {"results.win_percent": -1}},
		{"$limit": 10}
	],
	function(err,result){
		if(err){console.log(err)};
		console.log("returning result from sortOptimal!");
		cb(result);
	})
}

function optimalTeam1(arr,cb){
	//search Game DB for arr as Team 0 composition
	console.log("Searching for Games with this Team 0 composition: "+arr);
	Game.aggregate([
		{ "$match": {"playerInfo.player_hero": {"$all": arr}} },
		{ "$unwind": "$playerInfo" },
		{ "$group": {
			"_id": { "_id": "$_id", "j_map_name": "$j_map_name" },
			"player_heroes": {"$push": "$playerInfo.player_hero"},
			"player_team": { "$push": "$playerInfo.team_id"},
			"winner_losers": {"$push": "$playerInfo.match_result"}
		}},
		{ "$project": {
			"_id": "$_id._id",
			"id_team": { "$substr": ["$_id._id",0,-1]}, //"$concat": ["$_id._id"," - team 0"]},
			"map": "$_id.j_map_name",
			"search": arr,
			"team0_heroes": { "$slice": ["$player_heroes",0,5]},
			"team1_heroes": { "$slice": ["$player_heroes",5,5]},
			"team0result": { "$cond": { if: { "$eq": [ { "$arrayElemAt": [ "$winner_losers", 0 ] },1 ]}, then: 1, else: 0 }},
			"team1result": { "$cond": { if: { "$eq": [ { "$arrayElemAt": [ "$winner_losers", 9 ] },1 ]}, then: 1, else: 0 }}, 
		}},
		{ "$project": {
			"_id": 1,
			"id_team": { "$concat": ["$id_team"," - team 0"]}, //"$concat": ["$_id._id"," - team 0"]},
			"map": 1,
			"search": 1,
			"team0_heroes": 1, 
			"team1_heroes": 1, 
			"team0result": 1, 
			"team1result": 1 
		}},
		{ "$unwind": "$team0_heroes" },
		{ "$sort": { "team0_heroes": 1 }},
		{ "$group": {
			"_id": { "_id": "$_id", "id_team": "$id_team", "map": "$map", "search": "$search"},
			"team0_heroes": { "$push": "$team0_heroes" },
			"team1_heroes": { "$first": "$team1_heroes" },
			"team0result": { "$first": "$team0result" },
			"team1result": { "$first": "$team1result" },
		}},
		{ "$unwind": "$team1_heroes" },
		{ "$sort": { "team1_heroes": 1 }},
		{ "$group": {
			"_id": { "_id": "$_id._id", "id_team": "$_id.id_team", "map": "$_id.map", "search": "$_id.search"},
			"team0_heroes": { "$first": "$team0_heroes" },
			"team1_heroes": { "$push": "$team1_heroes" },
			"team0result": { "$first": "$team0result" },
			"team1result": { "$first": "$team1result" },
		}}, 
		{ "$match": { "team0_heroes": { "$all": arr}}}, //match by games where team0heroes contains the characters in arr
		{ "$group": {
			"_id": "$team1_heroes", // pivot by different opponents against matching games
			"game_ids": { "$push": "$_id._id"},
			"team_game_ids": { "$push": "$_id.id_team"}, 
			"enemyTeamHeroes": { "$push": "$team0_heroes" }, // store team 0 hero combinations in an array in case you need it later
			"game_wins": {"$push": "$team1result"},
			"total_wins": {"$sum": "$team1result" }, 
			"total_games": {"$sum": 1},
			"search": {"$first": "$_id.search"} //enemy heroes selected
		}}, 
		{ "$project": {
			"_id": 1,
			"game_ids": 1,
			"team_game_ids": 1,
			"enemyTeamHeroes": 1,
			"game_wins": 1,
			"total_wins": 1,
			"total_games": 1, 
			"win_percent": { "$divide": ["$total_wins","$total_games"]},
			"search": 1
		}},		
		{ "$group": {
			"_id": "$search",
			"results": { "$push": "$$ROOT" }
		}},
		{ "$project": {
			"_id":0,
			"search": "$_id",
			"results._id": 1,
			"results.game_ids": 1,
			"results.team_game_ids": 1,
			"results.enemyTeamHeroes": 1,
			"results.total_wins": 1,
			"results.total_games": 1, 
			"results.win_percent": 1,
			"results.game_wins": 1
		}}, 
		],			
		function(err,result){
			if(err) { return err };	
			if(result.length<1){ //
				console.log("No game data exists with current selected enemies");
				cb(1);
			} //
			else { //
				console.log("Checking collections...");
				// if the Record Collection does not exist, create the Record collection and save results into Record				
				mongoose.connection.db.listCollections({name: 'records'}).next(function(err,info){
					if(info<1){//
						console.log("No Collection named testrecords.  Creating now.")
						var record = new Record(result[0])
						record.save(function(err,saved){
							if(err) return console.error(err);
							console.log("new record saved: "+JSON.stringify(record));
						})		//				
					} //
					else {//
						//else find the record document that matches arr
						var queryResults = Record.findBySearch(arr);
						queryResults.find(function(err,res){ //
							//if no record documents matches arr then save results in Record as a new document
							//console.log("res[0]: "+res[0]);
							//console.log("result: "+JSON.stringify(result));
							if(res[0]===undefined || res.length<1){ //
							//if(res[0].results.length<1){
								var record = new Record(result[0]);
								var upsertRecord = record.toObject();
								delete upsertRecord._id;
								Record.update({"search":arr},upsertRecord,{upsert:true},function(err,stuff){ //
									console.log("upsert successful for: "+upsertRecord.search);
								})//
							} // 
							//else see if _id (unique team composition) in results exists in Record collection
							else {//else see if _id (unique team composition) in results exists in Record collection
								var updatedRecord = res[0].results.slice(0)
								var numNew = 0;
								var numMatch = 0;
								//!!res is Record DB.  result is games from Game DB where arr of characters are in Team 0
								for (i in result[0].results){ //
									var id_new= true;
									for (n in res[0].results){ //
										/*
										if(res[0].results[n]._id===undefined){
											console.log("res results id: "+res[0].results[n]._id);
											console.log("res results[n]: "+res[0].results[n]);
										}
										if(result[0].results[i]._id===undefined){
											console.log("result results id: "+result[0].results[i]._id);
											console.log("result results[i]: "+result[0].results[i]);
										}
										console.log("res results id: "+res[0].results[n]._id);
										console.log("***"+res[0].results[n]);
										console.log("result results id: "+result[0].results[i]._id);
										console.log("***"+result[0].results[i]); */
										if (res[0].results[n]._id.join() === result[0].results[i]._id.join()){ //if _id (team composition) in res exists in result then do the following
											console.log("***MATCH*** | i: "+i+" and n: "+n);//set game id differences across two totalGames arrays to newGames											
											var newGames = arrayDiff(res[0].results[n].team_game_ids,result[0].results[i].team_game_ids); //new games is collection of different game ids between record database and current results
											//merge newGames info into updatedRecord
											if(newGames!="") { //add the gameID to game_ids, add wins to game_wins, add enemyTeamHeroes to enemyTeamHeroes
												console.log("new team ids (1): "+newGames+" for: "+res[0].results[n]._id);
												var indexMatches = findIndexes(newGames,result[0].results[i].team_game_ids); //find index where newGame values exist
												updatedRecord[n].team_game_ids=updatedRecord[n].team_game_ids.concat(newGames); //push newGames ids into updatedRecord (team_game_ids)
												var game_id_diff = arrayDiff(res[0].results[n].game_ids,result[0].results[i].game_ids);
												updatedRecord[n].game_ids=updatedRecord[n].game_ids.concat(game_id_diff); //push game_id_diff into updatedRecord (game_ids)
												updatedRecord[n].total_games+=newGames.length ;
												for(x in indexMatches){
													updatedRecord[n].game_wins = updatedRecord[n].game_wins.concat(result[0].results[i].game_wins[x]); //push new wins to game_wins
													updatedRecord[n].enemyTeamHeroes = updatedRecord[n].enemyTeamHeroes.concat(result[0].results[i].enemyTeamHeroes[x]); //push new enemyTeamHeroes
												} //
												updatedRecord[n].total_wins=updatedRecord[n].game_wins.reduce(function(a,b){return a+b;}) //add up wins
												updatedRecord[n].win_percent=(updatedRecord[n].total_wins/updatedRecord[n].total_games).toFixed(2);
												numMatch--;
											} //
											numMatch++
											id_new = false;
										} //
									} //
									if(id_new){ //if current result _id is not in result database, insert the new data into the result database
										numNew++;
										updatedRecord.push(result[0].results[i]);
										//console.log("inserting: "+JSON.stringify(result[0].results[i])+" N: "+numNew);
									} //
								} //

								if (numMatch===result[0].results.length){ //if all ids exist in database already and have no unique team-specific data then...
									console.log("numMatch ("+numMatch+") equals unique hero combinations against "+arr+" ("+result[0].results.length+")"); //don't do anything
								} //
								else{ //if even one id does not exist in database or unique team-specific data exists then update the database
									res[0].results=updatedRecord ;
									var saveRecords=new Record(res[0]) 
									Record.update({"search":arr},saveRecords,{upsert:false},function(err,stuff){
										console.log("Update successful");
									}) //
								}//
							}//
						}) //queryresults close
					} //else close
					cb(1);
				})// mongoose connection close
			} // else close
		} // callback close						
	)	// aggregate close
} //optimalTeam1 close

function optimalTeam2(arr,cb){
	console.log("Searching for Games with this Team 1 composition: "+arr);
	Game.aggregate([
		{ "$match": {"playerInfo.player_hero": {"$all": arr}} },
		{ "$unwind": "$playerInfo" },
		{ "$group": {
			"_id": { "_id": "$_id", "j_map_name": "$j_map_name" },
			"player_heroes": {"$push": "$playerInfo.player_hero"},
			"player_team": { "$push": "$playerInfo.team_id"},
			"winner_losers": {"$push": "$playerInfo.match_result"}
		}},
		{ "$project": {
			"_id": "$_id._id",
			"id_team": { "$substr": ["$_id._id",0,-1]}, 
			"map": "$_id.j_map_name",
			"search": arr,
			"team0_heroes": { "$slice": ["$player_heroes",0,5]},
			"team1_heroes": { "$slice": ["$player_heroes",5,5]},
			"team0result": { "$cond": { if: { "$eq": [ { "$arrayElemAt": [ "$winner_losers", 0 ] },1 ]}, then: 1, else: 0 }},
			"team1result": { "$cond": { if: { "$eq": [ { "$arrayElemAt": [ "$winner_losers", 9 ] },1 ]}, then: 1, else: 0 }}, 
		}},
		{ "$project": {
			"_id": 1,
			"id_team": { "$concat": ["$id_team"," - team 1"]}, //"$concat": ["$_id._id"," - team 1"]},
			"map": 1,
			"search": 1,
			"team0_heroes": 1, 
			"team1_heroes": 1, 
			"team0result": 1, 
			"team1result": 1 
		}},
		{ "$unwind": "$team0_heroes" },
		{ "$sort": { "team0_heroes": 1 }},
		{ "$group": {
			"_id": { "_id": "$_id", "id_team": "$id_team", "map": "$map", "search": "$search"},
			"team0_heroes": { "$push": "$team0_heroes" },
			"team1_heroes": { "$first": "$team1_heroes" },
			"team0result": { "$first": "$team0result" },
			"team1result": { "$first": "$team1result" },
		}},
		{ "$unwind": "$team1_heroes" },
		{ "$sort": { "team1_heroes": 1 }},
		{ "$group": {
			"_id": { "_id": "$_id._id", "id_team": "$_id.id_team", "map": "$_id.map", "search": "$_id.search"},
			"team0_heroes": { "$first": "$team0_heroes" },
			"team1_heroes": { "$push": "$team1_heroes" },
			"team0result": { "$first": "$team0result" },
			"team1result": { "$first": "$team1result" },
		}}, 
		{ "$match": { "team1_heroes": { "$all": arr}}}, //match by games where team1heroes contains the characters in arr
		{ "$group": {
			"_id": "$team0_heroes", // pivot by different opponents against matching games
			"game_ids": { "$push": "$_id._id"},
			"team_game_ids": { "$push": "$_id.id_team"}, 
			"enemyTeamHeroes": { "$push": "$team1_heroes" }, // store team 1 hero combinations in an array in case you need it later
			"game_wins": {"$push": "$team0result"},
			"total_wins": {"$sum": "$team0result" },
			"total_games": {"$sum": 1 },
			"search": {"$first": "$_id.search"} //enemy heroes selected
		}},
		{ "$project": {
			"_id": 1,
			"game_ids": 1,
			"team_game_ids": 1,
			"enemyTeamHeroes": 1,
			"game_wins": 1,
			"total_wins": 1,
			"total_games": 1, // {"$size": "$results.team_game_ids"},
			"win_percent": { "$divide": ["$total_wins","$total_games"]},//{ "$divide": ["$total_wins","$total_games"]},
			"search": 1
		}},	
		{ "$group": {
			"_id": "$search",
			"results": { "$push": "$$ROOT" }
		}},
		{ "$project": {
			"_id": 0,
			"search": "$_id",
			"results._id": 1,
			"results.game_ids": 1,
			"results.team_game_ids": 1,
			"results.enemyTeamHeroes": 1,
			"results.total_wins": 1,
			"results.total_games": 1, //{"$size": "$results.team_game_ids"},
			"results.win_percent": 1,
			"results.game_wins": 1,
		}},
		],			
		function(err,result){
			if(err) { return err };	
			if(result.length<1){
				console.log("No game data exists with current selected enemies");
				cb(1);
			}
			else {			
				console.log("Checking collections...");
				// if the Record Collection does not exist, create the Record collection and save results into Record				
				mongoose.connection.db.listCollections({name: 'records'}).next(function(err,info){
					if(info<1){
						console.log("No Collection named testrecords.  Creating now.")
						var record = new Record(result[0])
						record.save(function(err,saved){
							if(err) return console.error(err);
							console.log("new record saved: "+JSON.stringify(record));
						})						
					}
					else { //else find the record document that matches arr						
						var queryResults2 = Record.findBySearch(arr);
						queryResults2.find(function(err,res){
							//console.log("res[0]: "+res);
							//console.log("res: "+JSON.stringify(res));							
							if(res[0]===undefined || res.length<1){ //if no record documents matches arr then save results in Record as a new document
								var record = new Record(result[0]);
								var upsertRecord = record.toObject();
								delete upsertRecord._id;
								Record.update({"search":arr},upsertRecord,{upsert:true},function(err,stuff){
									console.log("upsert successful for: "+upsertRecord.search);
								})
							}
							else {//else see if _id (unique team composition) in results exists in Record collection
								var updatedRecord2 = res[0].results.slice(0)
								var numNew2 = 0;
								var numMatch2 = 0;
								//!!res is Record DB.  result is results based on the arr of characters you're currently evaluating
								for (i in result[0].results){
									var id_new2= true;
									for (n in res[0].results){										
										if (res[0].results[n]._id.join() === result[0].results[i]._id.join()){ //if _id (team composition) in res exists in result then do the following
											console.log("***MATCH*** | i: "+i+" and n: "+n);//set game id differences across two totalGames arrays to newGames											
											var newGames2 = arrayDiff(res[0].results[n].team_game_ids,result[0].results[i].team_game_ids); //new games is collection of different game ids between record database and current results
											//merge newGames info into updatedRecord
											if(newGames2!="") { //add the gameID to game_ids, add wins to game_wins, add enemyTeamHeroes to enemyTeamHeroes
												console.log("new team ids (2): "+newGames2+" for: "+res[0].results[n]._id);
												var indexMatches = findIndexes(newGames2,result[0].results[i].team_game_ids); //find index where newGame values exist
												updatedRecord2[n].team_game_ids=updatedRecord2[n].team_game_ids.concat(newGames2); //push newGames ids into updatedRecord (team_game_ids)
												var game_id_diff = arrayDiff(res[0].results[n].game_ids,result[0].results[i].game_ids);
												updatedRecord2[n].game_ids=updatedRecord2[n].game_ids.concat(game_id_diff); //push game_id_diff into updatedRecord (game_ids)
												updatedRecord2[n].total_games+=newGames2.length ;
												for(x in indexMatches){
													updatedRecord2[n].game_wins = updatedRecord2[n].game_wins.concat(result[0].results[i].game_wins[x]); //push new wins to game_wins
													updatedRecord2[n].enemyTeamHeroes = updatedRecord2[n].enemyTeamHeroes.concat(result[0].results[i].enemyTeamHeroes[x]); //push new enemyTeamHeroes
												}
												updatedRecord2[n].total_wins=updatedRecord2[n].game_wins.reduce(function(a,b){return a+b;}) //add up wins
												updatedRecord2[n].win_percent=(updatedRecord2[n].total_wins/updatedRecord2[n].total_games).toFixed(2);
												numMatch2--;
											}
											numMatch2++
											id_new2 = false;
										}
									}
									if(id_new2){ //if current result _id is not in result database, insert the new data into the result database
										numNew2++;
										updatedRecord2.push(result[0].results[i]);
										//console.log("inserting: "+JSON.stringify(result[0].results[i])+" N: "+numNew2);
									}
								}

								if (numMatch2===result[0].results.length){ //if all ids exist in database already and have no unique team-specific data then...
									console.log("numMatch2 ("+numMatch2+") equals unique hero combinations against "+arr+" ("+result[0].results.length+")"); //don't do anything
								}
								else{ //if even one id does not exist in database or unique team-specific data exists then update the database
									res[0].results=updatedRecord2 ;
									var saveRecords=new Record(res[0]) 
									Record.update({"search":arr},saveRecords,{upsert:false},function(err,stuff){
										console.log("Update successful");
									})
								}
							}
						})
					}
					cb("success!");
				})
			}				
		}	
	)
}		

function arrayDiff(b,a){
	return a.filter(function(i) {
		return b.indexOf(i) < 0; 
	});
}

function findIndexes(a,b){
	var indexMatches = [];
	for(x in a){
		for (y in b){
			var valA = a[x];
			var valB = b[y];
			if(valA===valB){
				indexMatches.push(y);
				break;
			}
		}
	}
	console.log("indexMatches: "+indexMatches);
	return indexMatches;
}
