var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');

var feedbackSchema = mongoose.Schema({
	_id: Date,
	username: String,
	comments: String,
	upvotes: Number
},{strict: false, versionKey: false, collection: 'feedback'});

feedbackSchema.statics.pastComments = function(limitDate){
	return this.find({ _id: {$lt: limitDate }}).sort({_id: -1}); 
	//*** from <limit> to next 20 comments *** add this
}

//create the model for users and expose it to our app
module.exports = mongoose.model('Feedback', feedbackSchema, 'feedback');