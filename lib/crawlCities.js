// util
var _ = require('lodash');
var Promise = require('bluebird');

// request and parser
var cheerio = require('cheerio');
var request = Promise.promisify(require('request'));

// debug messages
var debug = require('debug');

// db
var db = require('../db');
var Cities = db.models.Cities;
var States = db.models.States;

/**
 * Crawl all cities of an state based on one type of fuel.
 * At first the functions request the page Resumo_Por_Estado_Municipio.asp
 * of anp domain, then parse the page and collect the table containg the
 * cities statistics and the reference for its details and stations.
 *
 * @param  {String} selSemana week identification
 * @param  {Object} fuel      Object with fuel info (name and codId)
 * @param  {Object} state     Object with database document and state identification (selEstado)
 * @return {Promise<Array(selSemana, cities)>}           Array with the code of the week and the
 *                                                       array of the cities
 */
var crawlCities = function(selSemana, fuel, state){
	var semana = selSemana.split(' ');
	var dates = {
		from: new Date(semana[1]),
		to: new Date(semana[3])
	};


	var crawlmenssage = [selSemana,state.document.name,fuel.fuelType].join()
	debug('crawler:min:crawlCities')(crawlmenssage, 'request');
	return request({
		url: 'http://www.anp.gov.br/preco/prc/Resumo_Por_Estado_Municipio.asp',
		method: 'POST',
		encoding: 'binary',
		form: {
			selSemana: selSemana,
			selEstado: state.selEstado,
			selCombustivel: fuel.selCombustivel
		}
	}).then(function(html){
		debug('crawler:min:crawlCities')(crawlmenssage, 'parsing');

		// parsing .....
		var $ = cheerio.load(html.toString());

		// get all rows from table of cities stats
		var rows = $('tr');

		var cities = [];
		var citiesRef = {};
		var allInsertions = [];
		rows.slice(3, rows.length).each(function(i, row){

			var cols = $(row).children();	// all columns

			// get city info
			var name = cols.eq(0).text();
			var selMunicipio = cols.eq(0).children('a')[0].attribs.href.split('\'')[1]
			citiesRef[selMunicipio] = {
				name: name,
				state: state.document._id
			};

			// get statistics
			var statistics = {
				fuelType: fuel.fuelType,
				consumerPrice: [{
					averagePrice: parseFloat(cols.eq(2).html().replace(',', '.')) || null,
					standardDeviation:  parseFloat(cols.eq(3).html().replace(',', '.'))  || null,
					minPrice:  parseFloat(cols.eq(4).html().replace(',', '.'))  || null,
					maxPrice:  parseFloat(cols.eq(5).html().replace(',', '.'))  || null,
					averageMargin:  parseFloat(cols.eq(6).html().replace(',', '.'))  || null
				}],
				distributionPrice: [{
					averagePrice:  parseFloat(cols.eq(7).html().replace(',', '.'))  || null,
					standardDeviation:  parseFloat(cols.eq(8).html().replace(',', '.'))  || null,
					minPrice:  parseFloat(cols.eq(9).html().replace(',', '.'))  || null,
					maxPrice:  parseFloat(cols.eq(10).html().replace(',', '.'))  || null
				}]
			};

			allInsertions.push(
				Cities.findOne(citiesRef[selMunicipio])
					.then(function(cityFound){
						if(!cityFound){
							var newCity = new Cities(citiesRef[selMunicipio]);
							newCity.dates = dates;
							return newCity.save().then(function(cityInserted){
								States.findByIdAndUpdate(
									state.document._id,
									{$push: {'cities': cityInserted}},
									{safe: true, upsert: true},
									function(err, model) {
										debug('crawler:min:crawlCities')(crawlmenssage+' -> '+cityInserted.name, 'inserted');
									}
								);
								return Promise.resolve(cityInserted);
							})
						}else{
							return Promise.resolve(cityFound);
						}
					}).then(function(cityDoc){
						cityDoc.statistics.push(statistics);
						return cityDoc.save();
					}).then(function(cityDoc){
						cities.push({
							document: cityDoc,
							selMunicipio: selMunicipio,
						});
						return Promise.resolve(cityDoc);
					})
			);
		});

		return Promise.all(allInsertions)
			.then(function(){
				debug('crawler:min:crawlCities')(crawlmenssage, 'finish');
				debug('crawler:extra:crawlCities')([selSemana, cities]);

				return Promise.resolve([selSemana, cities]);
			});
	});
};

module.exports = crawlCities;