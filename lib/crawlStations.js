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
var Stations = db.models.Stations;

/**
 * Crawl the last level of ANP Fuels' page, collecting the stations and its prices
 * It scraps the page to find the stations info and prices for the fuel(parameter).
 * Then on one hand it verifies if the station already exist, if not a new station
 * is created with the prices found. On the other hand, if the station already
 * exists the algorithm just push prices on the array of prices of that station
 * document.
 * @param  {String} selSemana  week identification
 * @param  {[type]} fuel       collect info of this kind of fuel
 * @param  {[type]} city       city that contains the stations
 * @return {Promise<Object>}   return all the stations found
 */
var crawlStations = function(selSemana, fuel, city){

	var semana = selSemana.split(' ');
	var dates = {
		from: new Date(semana[1]),
		to: new Date(semana[3])
	};

	var crawlmenssage = [selSemana,city.document.name,fuel.fuelType].join()
	debug('crawler:min:crawlStations')(crawlmenssage, 'request');
	
	return request({
		url: 'http://www.anp.gov.br/preco/prc/Resumo_Semanal_Posto.asp',
			method: 'POST',
			encoding: 'binary',
			form: {
				'cod_semana': selSemana.split('*')[0],
				'selMunicipio': city.selMunicipio,
				'cod_combustivel': fuel.selCombustivel.split('*')[0]
			}
	}).then(function(html){

		debug('crawler:min:crawlStations')(crawlmenssage, 'parsing');

		// parsing .....
		var $ = cheerio.load(html.toString());

		// get all rows from table of cities stats
		var rows = $('div.multi_box3 table.table_padrao tr');

		var stations = {};
		var allInsertions = [];	// keep all insertions promised
		rows.slice(1, rows.length).each(function(i, row){
			var cols = $(row).children();	// all columns

			// get stations
			var name = cols.eq(0).text()
			stations[name] = {
				name: name,
				address: cols.eq(1).text(),
				area: cols.eq(2).children().text(),
				flag: cols.eq(3).text(),
				city: city.document_id
			};

			// get prices
			var prices = {
				fuelType: fuel.fuelType,
				sellPrice: parseFloat(cols.eq(4).html().replace(',', '.')) || null,
				buyPrice: parseFloat(cols.eq(5).html().replace(',', '.')) || null,
				saleMode: cols.eq(6).html()  || null,
				provider: cols.eq(7).html() ? new Date(cols.eq(7).html()) : null,
				date: cols.eq(8).html() ? new Date(cols.eq(8).html()) : null
			};

			// push to sincronize with allInsertions
			allInsertions.push(
				Stations.findOne({
					name: stations[name].name,
					address: stations[name].address,
					area:  stations[name].area
				})	// verify if the station already exists
					.then(function(stationFound){

						if(!stationFound){	// if doesnt exists create a new station
							var newStation = new Stations(stations[name]);
							newStation.dates = dates;
							return newStation.save()
								.then(function(stationInserted){
									Cities.findByIdAndUpdate(
										city.document._id,
										{$push: {'stations': stationInserted}},
										{safe: true, upsert: true},
										function(err, model) {
											debug('crawler:min:crawlStations')(crawlmenssage+' -> '+stationInserted.name, 'inserted');
										}
									);
									return Promise.resolve(stationInserted);
								});
						}else{						// if exists, just return the station
							return Promise.resolve(stationFound);
						}
					}).then(function(stationDoc){
						stationDoc.prices.push(prices);		// add prices for this fuel
						return stationDoc.save()
							.then(function(){
								return Promise.resolve();
							});
					}).catch(function(err){
						console.log(dates, semana, stations[name]);
						return Promise.reject(err);
					})
			);
		});
		
		return Promise.all(allInsertions)	// sincronize all insertions
			.then(function(){
				debug('crawler:min:crawlStations')(crawlmenssage, 'finish');
				debug('crawler:extra:crawlStations')([selSemana, stations]);

				return Promise.resolve([selSemana, stations]);
			});
	});
}

module.exports = crawlStations;