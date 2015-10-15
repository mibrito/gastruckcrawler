var _ = require('lodash');
var Promise = require('bluebird');
var sleep = require('sleep');

var cheerio = require('cheerio');
var request = Promise.promisify(require('request'));

var debug = require('debug');

var db = require('./db');
var States = db.models.States;
var Cities = db.models.Cities;
var Stations = db.models.Stations;

// crawls
var crawlStatesAndFuelTypes = require('./lib/crawlStatesAndFuelTypes');
var crawlCities = require('./lib/crawlCities');
var crawlStations = require('./lib/crawlStations');


/**
 * This function goes down in the tree of state pages calling
 * crawlCities followed by crawlStations, propagating the results found
 * on parent step for each fuel
 * 
 * @param  {String} selSemana Week identification
 * @param  {Object} fuel        Object with fuel info (name and codId)
 * @param  {Array}  states      Array of states with database document and state
 *                              identification (selEstado)
 * @param  {Integer} sleeptime  Politeness of requests
 * @return {Promise<Array>}     A promise just to indicate that all the steps have finished
 */
var walkTreeOfPages = function(selSemana, fuel, states, sleeptime){
	var allCitiesPromised = [];
	states.forEach(function(state){
		
		// go deep on cities
		sleep.usleep(sleeptime);	// been polited
		allCitiesPromised.push(
			crawlCities(selSemana, fuel, state)	// crawl all cities statistics one by one
				.spread(function(selSemana, cities){

					// go deep on stations
					var allStationsPromised = [];
					cities.forEach(function(city){
						sleep.usleep(sleeptime);	// been polited
						allStationsPromised.push(crawlStations(selSemana, fuel, city)); // crawl all stations prices one by one
					});

					return Promise.all(allStationsPromised);
				})
		);
	});

	return Promise.all(allCitiesPromised);
}

db.connect(function(){
	var sleeptime = process.env.POLITENESS || 500000;
	debug('crawler:min:start')('start crawling.....');
 	crawlStatesAndFuelTypes().spread(function(selSemana, states, fuels){
 		walkTreeOfPages(selSemana, fuels[0], states, sleeptime)	// create all documents
 		.then(function(){
 			return walkTreeOfPages(selSemana, fuels[1], states, sleeptime)
 		}).then(function(){
 			return walkTreeOfPages(selSemana, fuels[2], states, sleeptime)
 		}).then(function(){
 			return walkTreeOfPages(selSemana, fuels[3], states, sleeptime)
 		}).then(function(){
 			return walkTreeOfPages(selSemana, fuels[4], states, sleeptime)
 		}).then(function(){
 			return walkTreeOfPages(selSemana, fuels[5], states, sleeptime)
 		}).then(function(){
 			debug('crawler:min:end')('end crawling.....');
 			db.disconnect();
 		});
 	});
});