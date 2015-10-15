# gastruckcrawler

Gastruck crawler is a simple crawler to collect data from [ANP](http://www.anp.gov.br/preco/) 'Por Estado' web page and stores
them on a settable mongo database.

## Run
To execute the crawl and use the default database "mongodb://localhost/gastruck" and 0.5 sec of politiness between requests
just run:


```
npm start
```

## Extra Parameters

### DEBUG

There are two types of debug message for the crawlers:

1. crawler:min:*

It shows info about beging of the phases of crawl: request, parsing and finised
Aditionaly it shows info about insertions on array of cities (for states) and array
of stations (for cities)

2. crawler:extra:*

Shows the returning values of each crawl function.

## Resulting Data Schema

1. States:

```
{
	name: String,
	
	cities: [ Cities ],

	dates: {
		from: Date
		to: Date
	}
}
```

2. Cities:

```
{
	state: {State},
	name: String,
	statistics: [{
		fuelType: String,
		consumerPrice: [{
			averagePrice: Number,
			standardDeviation: Number,
			minPrice: Number,
			maxPrice: Number,
			averageMargin: Number
		}],
		distributionPrice: [{
			averagePrice: Number,
			standardDeviation: Number,
			minPrice: Number,
			maxPrice: Number,
		}],
	}],
	stations: [Stations],
	dates: {
		from: Date,
		to: Date,
	}
}
```

3. Stations

```
{
	city: {Cities},
	name: String,
	address: String,
	area: String,
	flag: String,
	prices: [{
		fuelType: String,
		sellPrice: Number,
		buyPrice: Number,
		saleMode: String,
		provider: Date,
		date: Date,
	}],
	dates: {
		from: Date,
		to: Date,
	}
}
```

## Lib used

1. Database
[Mongoose](https://github.com/Automattic/mongoose)

2. Request/Parsing
[Cheerio](https://github.com/cheeriojs/cheerio)
[Request](https://github.com/request/request)

3. Utils
[Bluebird](https://github.com/petkaantonov/bluebird) (promises)
[Lodash](https://lodash.com/docs) (extra data functions)