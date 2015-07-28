var Reports = connection.model('Reports');

require('../../core/controller.js');

function ReportsController(model) {
    this.model = model;
    this.searchFields = [];
}

ReportsController.inherits(Controller);

var controller = new ReportsController(Reports);

exports.ReportsFindAll = function(req,res){
    req.query.trash = true;
    //req.query.companyid = true;

    req.query.fields = ['reportName'];

    controller.findAll(req, function(result){
        serverResponse(req, res, 200, result);
    });
};

exports.ReportsFindOne = function(req,res){
    req.query.trash = true;
    //req.query.companyid = true;

    controller.findOne(req, function(result){
        serverResponse(req, res, 200, result);
    });
};

exports.ReportsCreate = function(req,res){
    req.query.trash = true;
    //req.query.companyid = true;

    console.log(req.body);

    controller.create(req, function(result){
        serverResponse(req, res, 200, result);
    });
};

exports.ReportsUpdate = function(req,res){
    req.query.trash = true;
    //req.query.companyid = true;

    controller.update(req, function(result){
        serverResponse(req, res, 200, result);
    })
};

exports.ReportsDelete = function(req,res){
    var data = req.body;

    req.query.trash = true;
    req.query.companyid = true;

    data._id = data.id;
    data.nd_trash_deleted = true;
    data.nd_trash_deleted_date = new Date();

    req.body = data;

    controller.update(req, function(result){
        serverResponse(req, res, 200, result);
    });
};

exports.PreviewQuery = function(req,res)
{
    var data = req.query;
    var query = data.query;

    console.log('entering preview query');
    debug(query);

    processDataSources(query.datasources, {}, function(result) {
        //debug(result);
        serverResponse(req, res, 200, result);
    });

    /*processQuery(query, function(result){
        debug(result);
        serverResponse(req, res, 200, result);
    });*/
};

exports.ReportsGetData = function(req, res) {
    var data = req.query;
    var query = data.query;

    console.log('entering get report data');
    debug(query);

    processDataSources(query.datasources, {page: (data.page) ? data.page : 1}, function(result) {
        //debug(result);
        serverResponse(req, res, 200, result);
    });
};

function processQuery(query, done)
{

    for (var i in query.datasources) {
        processDataSource(query.datasources[i], function(result){
            done(result);
        });
    }


}

function processDataSource(datasourceQuery, done)
{
    //buscar los datasources en el repositorio
    var DataSources = connection.model('DataSources');
    var queryDTS = [];
    var notFoundDTS = [];


        DataSources.findOne({ _id: datasourceQuery.datasourceID }, function (err, dts) {
            if (dts) {
                executeDataSourceQuery(datasourceQuery,dts, function(result){
                    done(result);
                });
            } else {
                notFoundDTS.push(datasourcesList[i]);
            }
        });


}
///////////////////////////////////////////////////////////
function processDataSources(dataSources, params, done, result, index) {
    var index = (index) ? index : 0;
    var dataSource = (dataSources[index]) ? dataSources[index] : false;
    var result = (result) ? result : [];

    if (!dataSource) {
        done(result);
        return;
    }

    var DataSources = connection.model('DataSources');

    DataSources.findOne({ _id: dataSource.datasourceID}, {}, function (err, dts) {
        if (dts) {
            for (var i in dts.params[0].schema) {
                for (var j in dataSource.collections) {
                    if (dts.params[0].schema[i].collectionID == dataSource.collections[j].collectionID) {
                        dataSource.collections[i]['schema'] = dts.params[0].schema[i];
                    }
                }
            }
            
            switch (dts.type) {
                case 'MONGODB':
                    var mongodb = require('../../core/db/mongodb.js');

                    mongodb.processCollections(dataSource.collections, dts, params, function(data) {
                        for (var i in data) {
                            result.push(data[i]);
                        }

                        processDataSources(dataSources, params, done, result, index+1);
                    });
            }
        } else {
            processDataSources(dataSources, params, done, result, index+1);
        }
    });
}

/*function processMongoDBCollections(collections, dataSource, done, result, index) {
    var index = (index) ? index : 0;
    var collection = (collections[index]) ? collections[index] : false;
    var result = (result) ? result : [];

    if (!collection) {
        done(result);
        return;
    }
    
    console.log('entering mongoDB collections');
    var fields = {};

    var params = {skip: 0, limit: 10};
    
    var filters = getCollectionFilters(collection);

    console.log('the Filters');
    debug(filters);

    for (var i in collection.columns) {
        for (var e in collection.schema.elements) {
            if (collection.columns[i].elementID == collection.schema.elements[e].elementID) {
                fields[collection.schema.elements[e].elementName] = 1;
            }
        }
    }

    console.log('the fields to get');
    debug(fields);

    var MongoClient = require('mongodb').MongoClient , assert = require('assert');

    var dbURI =  'mongodb://'+dataSource.params[0].connection.host+':'+dataSource.params[0].connection.port+'/'+dataSource.params[0].connection.database;

    MongoClient.connect(dbURI, function(err, db) {
        if(err) { return console.dir(err); }

        var col = db.collection(collection.schema.collectionName);
        var find = (filters.length > 0) ? {$and:filters} : {};

        col.find(find, fields, params).toArray(function(err, docs) {
            //console.log(docs);

            for (var i in docs) {
                result.push(docs[i]);
            }

            db.close();

            processMongoDBCollections(collections, dataSource, done, result, index+1);
        });
    });
}*/

////////////////////////////

function executeDataSourceQuery(datasourceQuery,datasource,done)
{
    //identificar el tipo de datasource
    if (datasource.type == 'MONGODB')
    {
        executeMongoDBQuery(datasourceQuery,datasource,function(result){
               done(result);
        });
    }

}

function executeMongoDBQuery(datasourceQuery,datasource,done)
{
    console.log('entering mongoDB query');


    var collections = [];
    var queryCollections = [];

    for (var i in datasourceQuery.collections) {
        if (queryCollections.indexOf(datasourceQuery.collections[i].collectionID) == -1)
        {
            queryCollections.push(datasourceQuery.collections[i].collectionID);
            var queryCollection = datasourceQuery.collections[i];

            for (var n in datasource.params[0].schema) {
                if (datasourceQuery.collections[i].collectionID == datasource.params[0].schema[n].collectionID)
                {
                collections.push(datasource.params[0].schema[n]);
                    executeMongoDBCollection(queryCollection,datasource,datasource.params[0].schema[n], function(result){
                             done(result);
                    });
                }
            }
        }
    }


}

function executeMongoDBCollection(queryCollection,datasource,collection,done)
{
    console.log('entering mongoDB collection');
    var fieldsToGet = {};

    var params = {};
    params['skip'] = 0;
    params['limit'] = 10;

    /*
     if (req.query.page) {
     params['skip'] = (page-1)*perPage;
     params['limit'] = perPage;
     }

     if (req.query.limit) {
     params['limit'] = perPage;
     }

     if (req.query.sort) {
     if (typeof fieldsToGet == 'string') {
     var sortField = {};

     sortField[req.query.sort] = (req.query.sortType) ? req.query.sortType : 1;

     params['sort'] = sortField;
     }
     else {
     params['sort'] = req.query.sort;
     }
     }
     */
    var filters = getMongoDBFilters(queryCollection.filters, collection);

    console.log('the Filters '+JSON.stringify(filters));



    for (var i in queryCollection.columns) {
        //identificar el elemento de la colección
        for (var n in collection.elements) {
             if (queryCollection.columns[i].elementID == collection.elements[n].elementID)
             {
                 fieldsToGet[collection.elements[n].elementName] = 1;
             }
        }
    }


    //conn = mongoose.createConnection(dbURI,{ server: { poolSize: 5 } });

    var MongoClient = require('mongodb').MongoClient , assert = require('assert');

    var dbURI =  'mongodb://'+datasource.params[0].connection.host+':'+datasource.params[0].connection.port+'/'+datasource.params[0].connection.database;

    MongoClient.connect(dbURI, function(err, db) {
        if(err) { return console.dir(err); }

        console.log('the fields to get :  '+fieldsToGet);

        var col = db.collection(collection.collectionName);
        // Find some documents
        col.find({$and:filters},fieldsToGet,params).toArray(function(err, docs) {
            console.log(docs);
            done(docs);

            db.close();
        });
    });

   /*
    conn.on('connected', function () {
        console.log('Mongoose connection open to ' + dbURI);

        var collection = conn.db.collection('documents');
        // Find some documents
        collection.find(filters,fieldsToGet).toArray(function(err, docs) {
            console.log(docs);
            done(docs);

            conn.close();
        });
    });

    conn.on('error',function (err) {
        console.log('Mongoose default connection error: ' + err);
        serverResponse(req, res, 200, {result: 0, msg: 'Connection Error'});
    });
    */

}


function getMongoDBFilters(filters, collection)
{
    var theFilters = [];

    for (var i in filters) {
        //identificar el elemento de la colección
        for (var n in collection.elements) {
            if (filters[i].elementID == collection.elements[n].elementID) {
                var thisFilter = {};
                var filterElementName  =  collection.elements[n].elementName;

                if (filters[i].filterText1) {
                    if (filters[i].filterType == "equal") {
                        thisFilter[filterElementName] = filters[i].filterText1;
                    }
                    if (filters[i].filterType == "biggerThan") {
                        thisFilter[filterElementName] = {$gt: filters[i].filterText1};
                    }
                    if (filters[i].filterType == "notGreaterThan") {
                        thisFilter[filterElementName] = {$not: {$gt: filters[i].filterText1}};
                    }
                    if (filters[i].filterType == "biggerOrEqualThan") {
                        thisFilter[filterElementName] = {$gte: filters[i].filterText1};
                    }
                    if (filters[i].filterType == "lessThan") {
                        thisFilter[filterElementName] = {$lt: filters[i].filterText1};
                    }
                    if (filters[i].filterType == "lessOrEqualThan") {
                        thisFilter[filterElementName] = {$lte: filters[i].filterText1};
                    }
                    if (filters[i].filterType == "between") {
                        thisFilter[filterElementName] = {$gt: filters[i].filterText1, $lt: filters[i].filterText2};
                    }
                    if (filters[i].filterType == "notBetween") {
                        thisFilter[filterElementName] = {$not: {$gt: filters[i].filterText1, $lt: filters[i].filterText2}};
                    }
                    if (filters[i].filterType == "contains") {
                        thisFilter[filterElementName] = new RegExp(filters[i].filterText1, "i");
                    }
                    if (filters[i].filterType == "notContains") {
                        thisFilter[filterElementName] = {$ne: new RegExp(filters[i].filterText1, "i")};
                    }
                    if (filters[i].filterType == "startWith") {
                        thisFilter[filterElementName] = new RegExp('/^'+filters[i].filterText1+'/', "i");
                    }
                    if (filters[i].filterType == "notStartWith") {
                        thisFilter[filterElementName] = {$ne: new RegExp('/^'+filters[i].filterText1+'/', "i")};
                    }
                    if (filters[i].filterType == "endsWith") {
                        thisFilter[filterElementName] = new RegExp('/'+filters[i].filterText1+'$/', "i");
                    }
                    if (filters[i].filterType == "notEndsWith") {
                        thisFilter[filterElementName] = {$ne: new RegExp('/'+filters[i].filterText1+'$/', "i")};
                    }
                    if (filters[i].filterType == "like") {
                        thisFilter[filterElementName] = new RegExp('/'+filters[i].filterText1+'/', "i");
                    }
                    if (filters[i].filterType == "notLike") {
                        thisFilter[filterElementName] = {$ne: new RegExp('/'+filters[i].filterText1+'/', "i")};
                    }
                    if (filters[i].filterType == "null") {
                        thisFilter[filterElementName] = null;
                    }
                    if (filters[i].filterType == "notNull") {
                        thisFilter[filterElementName] = {$not: null};
                    }
                    if (filters[i].filterType == "in") {
                        thisFilter[filterElementName] = {$in: String(filters[i].filterText1).split(';')};
                    }
                    if (filters[i].filterType == "notIn") {
                        thisFilter[filterElementName] = {$nin: String(filters[i].filterText1).split(';')};
                    }
                }

                /*

                if (filters[i].filterType == "biggerThan")   //{ qty: { $gt: 25 } }  { price: { $not: { $gt: 1.99 } } }
                {
                    if (filters[i].filterText1)
                        thisFilter = {filterElementName: filters[i].filterText1}
                }

                {value:,label:"equal"},
                {value:"diferentThan",label:"diferent than"},
                 { item: { $not: valor } }
                {value:"biggerThan",label:"bigger than"},
                 { qty: { $gt: 25 } }
                {value:"biggerOrEqualThan",label:"bigger or equal than"},
                 { qty: { $gte: 25 } }
                {value:"lessThan",label:"less than"},
                 { qty: { $lt: 25 } }
                {value:"lessOrEqualThan",label:"less or equal than"},
                 { qty: { $lte: 25 } }
                {value:"between",label:"between"},
                 { field: { $gt: value1, $lt: value2 } }
                {value:"notBetween",label:"not between"},
                {value:"contains",label:"contains"},
                {value:"notContains",label:"not contains"},
                {value:"startWith",label:"start with"},
                {value:"notStartWith",label:"not start with"},

                {value:"endsWith",label:"ends with"},
                {value:"notEndsWith",label:"not ends with"},
                {value:"like",label:"como"},
                 db.users.find({"name": /.*m.*estoessinespaciolohepuestoporquelotomacomofindecometario/})
                {value:"notLike",label:"no como"},
                {value:"null",label:"is null"},
                 {sent_at: {$exists: false}}
                 {sent_at: null}
                {value:"notNull",label:"is not null"},
                {value:"in",label:"in"},
                 {
                 _id: { $in: [ 5,  ObjectId("507c35dd8fada716c89d0013") ] }
                 }


                {value:"notIn",label:"not in"}
                 {
                 _id: { $nin: [ 5,  ObjectId("507c35dd8fada716c89d0013") ] }
                 }
                */


                //TODO:Query a Field that Contains an Array
                //TODO:Subdocuments  http://docs.mongodb.org/manual/reference/method/db.collection.find/
                //if (!isEmpty(thisFilter)) {
                    theFilters.push(thisFilter);
                //}
            }
        }
    }

    return theFilters;
}

