var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');
var connection = mongoose.createConnection('mongodb://localhost:27017/new-meta');

//define schema for our user model
var performanceSchema = mongoose.Schema({
	_id: Number,
	char_name: String,
	games: Number,
	wins: Number,
	winPercent: Number,
	performance: [ new mongoose.Schema({
		p_name: String,
		p_games: Number,
		p_wins: Number,
		p_winPercent: Number
		}, {strict: false, versionKey:false})
	]},{strict: false, versionKey: false});

performanceSchema.statics.basicStats = function(hero){
	return this.find({char_name: hero});
}

//create the model for users and expose it to our app
module.exports = connection.model('Performance', performanceSchema);