var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');
var connection = mongoose.connect('mongodb://localhost:27017/new-meta');
//define schema for our user model
var gameSchema = mongoose.Schema({
	_id: String,
	map_name: String,
	time: Number,
	competitive: Boolean,
	playerInfo: [
		{bnet_id : Number, player_name: String, player_hero: String, team_id: 0, match_result: Number},
		{bnet_id : Number, player_name: String, player_hero: String, team_id: 0, match_result: Number},
		{bnet_id : Number, player_name: String, player_hero: String, team_id: 0, match_result: Number},
		{bnet_id : Number, player_name: String, player_hero: String, team_id: 0, match_result: Number},
		{bnet_id : Number, player_name: String, player_hero: String, team_id: 0, match_result: Number},
		{bnet_id : Number, player_name: String, player_hero: String, team_id: 1, match_result: Number},
		{bnet_id : Number, player_name: String, player_hero: String, team_id: 1, match_result: Number},
		{bnet_id : Number, player_name: String, player_hero: String, team_id: 1, match_result: Number},
		{bnet_id : Number, player_name: String, player_hero: String, team_id: 1, match_result: Number},
		{bnet_id : Number, player_name: String, player_hero: String, team_id: 1, match_result: Number}]
	},{versionKey: false });
/*
gameSchema.statics.findByHero = function(hero,callback){
	return this.find({"playerInfo.player_hero":hero},callback);
}*/
gameSchema.statics.fBHReturnGames = function(hero){
	return this.find({ 
		playerInfo: { 
			$elemMatch: {
				player_hero: hero 
			}
		}, 
		map_name: { $exists: true }
	});
};
gameSchema.statics.findByHero = function(hero){
	return this.find({"playerInfo.player_hero":hero});
}

gameSchema.statics.findHeroWins = function(query,char,callback){
	return query.where('playerInfo').elemMatch(function(elem){
		elem.where('player_hero').equals(char);
		elem.where('match_result').equals(1);
	}).exec(callback);
}
//create the model for users and expose it to our app
module.exports = connection.model('Game', gameSchema);