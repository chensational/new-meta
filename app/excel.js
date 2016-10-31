var Game = require('./models/games');
var Performance = require('./models/performance');
var Record = require('./models/record');
var Export = require('./excel.js');
var fs = require('fs');

var excelbuilder = require('msexcel-builder');

var heroesRoster = ["Abathur","Anub\'arak", "Artanis", "Arthas", "Azmodan", "Brightwing", "Chen", "Cho", "Diablo", "E.T.C.", "Falstad", "Gall", "Gazlowe", "Greymane", "Illidan", "Jaina", "Johanna", "Kael\'thas", "Kerrigan", "Kharazim", "Leoric", "Li Li", "Li-Ming", "Lt. Morales", "Lunara", "Malfurion", "Muradin", "Murky", "Nazeebo", "Nova", "Raynor", "Rehgar", "Rexxar", "Sgt. Hammer", "Sonya", "Stitches", "Sylvanas", "Tassadar", "The Butcher", "The Lost Vikings", "Thrall", "Tychus", "Tyrael", "Tyrande", "Uther", "Valla", "Xul", "Zagara", "Zeratul"];
//remove heroesRoster after you're done testing

function asyncFor(arr,perf_sheet,p_row,cb){
	if(arr.length<1){
		cb();
	} else {
		var char = arr.splice(0,1);
		Performance.find({"char_name": char }).sort({"_id": -1}).limit(1).find(function(err,dat){
			dat.forEach(function(obj){
				obj.performance.forEach(function(p){
					p_row++;
					perf_sheet.set(1,p_row,obj.char_name);
					perf_sheet.set(2,p_row,obj.games);
					perf_sheet.set(3,p_row,obj.wins);
					perf_sheet.set(4,p_row,obj.winPercent);
					perf_sheet.set(5,p_row,p.p_name);
					perf_sheet.set(6,p_row,p.p_games);
					perf_sheet.set(7,p_row,p.p_wins);
					perf_sheet.set(8,p_row,p.p_winPercent);
				})
			})
		}).then(function(res){
			asyncFor(arr,perf_sheet,p_row,cb);
		})
	}
}
exports.exportPerformance = function(arr,cb){
	var p_workbook = excelbuilder.createWorkbook('./excel','performance.xlsx');
	console.log("running exportPerformance");
	return new Promise(function(resolve,reject){
		var perf_sheet = p_workbook.createSheet('Performances',10,5000);
		var p_row = 1;
		perf_sheet.set(1,p_row,'Character');
		perf_sheet.set(2,p_row,'Total Games');
		perf_sheet.set(3,p_row,'Total Wins');
		perf_sheet.set(4,p_row,'Win Percent');
		perf_sheet.set(5,p_row,'Opposing Character');
		perf_sheet.set(6,p_row,'Games Against Opposing Char');
		perf_sheet.set(7,p_row,'Wins Against Opposing Char');
		perf_sheet.set(8,p_row,'Win Percent Against Opposing Char');

		asyncFor(arr.slice(0),perf_sheet,p_row,function(){
			console.log("ajaxPerformance resolved");
			p_workbook.save(function(err,merp){
				console.log("Performance workbook.save running...");
				if(err){
					console.log("P_WORKBOOK CANCELLED");
					p_workbook.cancel();
				} else {
					console.log('Performance Sheet Created.');
					cb();
				}
			})
			resolve('success');
		})
	})
}

exports.exportGames = function(cb){
	var workbook = excelbuilder.createWorkbook('./excel','games.xlsx');
	console.log("running exportGames");
	return new Promise(function(resolve,reject){
		var game_sheet = workbook.createSheet('Games',10,500000);  //max rows: 1048576
		var row = 1;
		var game = 0;
		Game.find({},function(err,dat){
			game_sheet.set(1,row,'Match');
			game_sheet.set(2,row,'Game ID');
			game_sheet.set(3,row,'Map Name');
			game_sheet.set(4,row,'Time');
			game_sheet.set(5,row,'Competitive?');
			game_sheet.set(6,row,'Player ID');
			game_sheet.set(7,row,'Player Name');
			game_sheet.set(8,row,'Player Hero');
			game_sheet.set(9,row,'Team ID');
			game_sheet.set(10,row,'Match Result');
			
			dat.forEach(function(obj){
				game++;
				var date = new Date(obj.time/10000 - 11644473600000)
				obj.playerInfo.forEach(function(p){
					row++;
				//	console.log("second loop: "+row);
					game_sheet.set(1,row,game);
					game_sheet.set(2,row,obj._id);
					game_sheet.set(3,row,obj.map_name);
					game_sheet.set(4,row,date);
					game_sheet.set(5,row,obj.competitive);
					game_sheet.set(6,row,p.bnet_id);
					game_sheet.set(7,row,p.player_name);
					game_sheet.set(8,row,p.player_hero);
					game_sheet.set(9,row,p.team_id);
					game_sheet.set(10,row,p.match_result);
				})
			})
		}).then(function(result){
			//console.log("result: "+result);
			if (!result) {
				console.log("ajaxGame error");
				return reject();
			} 
			console.log("ajaxGame resolved");
			workbook.save(function(err,merp){
				console.log("Game workbook.save running...");
				if(err){
					console.log("WORKBOOK CANCELLED");
					workbook.cancel();
				} else {
					console.log('Game Sheet Created.');
					cb();
				}
			})
			resolve(result);
		})
	})
}

exports.toExcel = function(arr,cb){

	var promises = [];
	promises.push(Export.exportGames(function(meow){
		console.log("export.exportGames completed");
	}));

	promises.push(Export.exportPerformance(arr,function(merp){
		console.log("export.exportPerformance completed");
	}));

	Promise.all(promises).then(function(){
		console.log("Games and Performance Exported!");
		cb();
		
	}, function(err){
		console.log("PROMISE FUNCTION ERR");
		cb(err);
	})
}
	

