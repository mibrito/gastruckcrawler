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
var States = db.models.States;



/**
 * Crawl the list of states an fuels of page
 * 'http://www.anp.gov.br/preco/prc/Resumo_Por_Estado_Index.asp'.
 *
 * The function fist make a request to anp web page and then parses it using
 * cheerio. The page contains four important html form inputs':
 *
 * - input[type=hidden name=selSemana]: week identifications code, used to navegate on pages' tree
 * - input[type=hidden name=desc_semana]: extract dates info to be attached the object inserted
 * 		on database
 * - select[name=selEstado] option: get the list of state names and identifications code. It save each
 * 		state when it is found, it keeps the resulting object inserted in an array to pass to the next
 * 		method which will use it to navagate on pages' tree.
 * - select[name=selCombustivel] option: get all fuels names and identifications code, used to describe
 * 		object on data base and to navegate on pages' tree.
 *
 * @return {Promise<Array(selSemana, states, fuels)>}      Returns the week identifications code,
 *                                           				Array of state objects inserted on database
 *                                           				Array of fuel objects
 */
var crawlStatesAndFuelTypes = function(){

	debug('crawler:min:crawlStates')('request');
	// request the page
	return request({
		url: 'http://www.anp.gov.br/preco/prc/Resumo_Por_Estado_Index.asp',
		method: 'get',
		encoding: 'binary'
	}).then(function(html){

		debug('crawler:min:crawlStates')('parsing');
		// parsing .....
		var $ = cheerio.load(html.toString());

		// get hidden params
		var selSemana = $('input[type=hidden]').eq(0)[0].attribs.value;
		var desc_semana = $('input[type=hidden]').eq(1)[0].attribs.value.replace('de ', '').split(' a ');
		var dates = {
			from: new Date(desc_semana[0]),
			to: new Date(desc_semana[1])
		};

		var statesRefs = {};
		var states = [];
		var allInsertions = [];
		$('select[name=selEstado] option').each(function(i, optState){
			var selEstado = optState.attribs.value;

			// get states info
			statesRefs[selEstado] = {
				name: optState.children[0].data,
				dates: dates
			};

			// save all insertion promises
			allInsertions.push(
				States.findOne(statesRefs[selEstado])
				.then(function(stateFound){
					if(!stateFound){
						var newState = new States(statesRefs[selEstado]);
						return newState.save();
					}else{
						return Promise.resolve(stateFound);
					}
				}).then(function(stateDoc){
					states.push({
						document: stateDoc,
						selEstado: selEstado
					});
					return Promise.resolve(stateDoc);
				})
			);
		});

		// get all fuels
		var fuels = [];
		$('select[name=selCombustivel] option').each(function(i, fuel){
			var selCombustivel = fuel.attribs.value;

			fuels.push({
				fuelType: fuel.children[0].data,
				selCombustivel: selCombustivel
			});
		});

		// wait all insertions
		return Promise.all(allInsertions)
			.then(function(){

				debug('crawler:min:crawlStates')('finish');
				debug('crawler:extra:crawlStates')([selSemana, states, fuels]);

				return Promise.resolve([selSemana, states, fuels]);
			});
	});
};

module.exports = crawlStatesAndFuelTypes;