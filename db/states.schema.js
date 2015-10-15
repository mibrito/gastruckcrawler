var _ = require('lodash');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var formatDate = require('../lib/formatDate');

var statesSchema = new Schema({
	name: String,
	cities: [{
		type: Schema.Types.ObjectId,
		ref: 'Cities'
	}],
	dates: {
		from: { type: Date, get: function(d){ return formatDate(d, '-', true);} },
		to: { type: Date, get: function(d){ return formatDate(d, '-', true);} }
	}
});

module.exports = mongoose.model('States', statesSchema);
