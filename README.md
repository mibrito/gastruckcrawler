# Gas Truck Crawler

Gastruck crawler is a simple crawler to collect data from [ANP](http://www.anp.gov.br/preco/) 'Por Estado' web page and stores
them on a settable mongo database.

## Install

```
git clone https://github.com/mibrito/gastruckcrawler.git
npm install
```

## Run
To execute the crawl and use the default database "mongodb://localhost/gastruck" and 0.5 sec of politiness between requests
just run:


```
npm start
```

## Extra Parameters

### DB

Change the default database to the desired one

##### Usage
```
DB=mongodb://localhost/gastruck npm start
```

### POLITENESS

Change the sleep time between requests (in milisecs)

##### Usage

0.5 secs

```
DB=500000 npm start
```

1 sec

```
DB=1000000 npm start
```


### DEBUG

There are two types of debug message for the crawlers:

#### 1. crawler:min:*

It shows info about beging of the phases of crawl: request, parsing and finised
Aditionaly it shows info about insertions on array of cities (for states) and array
of stations (for cities)

##### Usage
```
DEBUG=crawler:min:* npm start
```


#### 2. crawler:extra:*

Shows the returning values of each crawl function.

##### Usage
```
DEBUG=crawler:extra:* npm start
```

##### Combine
```
DEBUG=crawler:extra:*, crawler:extra:* npm start
```


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