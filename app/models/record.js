var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');
//var connection = mongoose.createConnection('mongodb://heroku_stzbwk35:up7ofiq7vqjmb9062h05ibhsbv@ds139847.mlab.com:39847/heroku_stzbwk35');
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
	]},{strict: false, versionKey: false, collection: 'records'});

recordSchema.statics.findBySearch = function(searchArr){
	return this.find({"search":searchArr});
}

//create the model for users and expose it to our app
module.exports = mongoose.model('Record', recordSchema);