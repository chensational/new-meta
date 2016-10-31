var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');
var connection = mongoose.createConnection('mongodb://localhost:27017/new-meta');
//define schema for our user model

var recordSchema = mongoose.Schema({
	search: String,
	results: [ new mongoose.Schema({
		_id: [String],
		game_ids: [Number],
		team_game_ids: [String],
		enemyTeamHeroes: [[String]],
		total_wins: Number,
		total_games: Number,
		win_percent: Number,
		game_wins: [Number] }, {strict: false, versionKey:false})
	]},{strict: false, versionKey: false});

recordSchema.statics.findBySearch = function(searchArr){
	return this.find({"search":searchArr});
}

//create the model for users and expose it to our app
module.exports = connection.model('Record', recordSchema);