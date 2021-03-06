var http = require("http");
var path = require("path");

var express = require("express");
var log = require('morgan');
var bodyParser = require('body-parser');

var mysql = require("mysql");
var cfg = require("./config.json");
var scores;

var listR = require(path.join(__dirname, 'modules/list.js'));
var app = express();
var db;
var dbSetupDone = false, dbPingDone = true;
var intervalId = setInterval(function(){
  if(!dbPingDone)
    return;
  if(dbSetupDone){
    clearInterval(intervalId);
    startServer();
  }
  else{
    console.log("Pinging database");
    createTable();
  }
}, 1000);

function startServer(){
  app.use(log('dev'));
  app.use(bodyParser.urlencoded({extended: false}));
  app.use('/list.json', listR(db));
  app.get('/', function(req, res, next){
    res.sendFile(path.join(__dirname, 'client/page.html'));
  });
  if(process.env.NODE_ENV === 'development'){
    console.log('dev env detected');
    app.use(express.static(path.join(__dirname, 'client')));
  }
  else {
    console.log("prod env detected");
    app.use(express.static(path.join(__dirname, 'client/build')));
  }
  app.get('/scores', function(req, res, next){
    var str = ''+req.query.rank;
    var num = str.slice(0, str.length-1) + '0';
    var range = req.query.range;
    if(!range || !str)
      res.redirect('/scores?range=10&rank=1');
    db.query(
      "SELECT name, score, rank FROM scores WHERE rank BETWEEN "
      + num + " AND " + (Number(num)+ Number(range))
      + " ORDER BY rank;"
      , function(err, data){
        db.query(
          "show table status;", function(err, stats){
            var scores = stats.filter(function(t){return t.Name == 'scores'})[0];
            var p1 = Number(scores.Rows)/Number(range); //Number of rows per page
            //if p1 has a decimel, then we need one more page for the remainder
            var pages = (p1 + "").indexOf('.') > 0 ? Math.floor(p1+1) : p1;
            var curPage = Math.floor(Number(num)/Number(range));
            res.render('scoreView', {scores: data, pages: pages, curPage: curPage});
          }
        );
      });
    });
  app.set('port', 8080);
  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine', 'ejs');
  var server = http.createServer(app);
  server.listen(8080);
}

//HELPER FUNCTIONS

function createTable(){
  dbPingDone = false;
  db = mysql.createConnection({
    host: cfg.host,
    user: cfg.username,
    password: cfg.password,
    database: cfg.database
  });
  db.query(
    "CREATE TABLE IF NOT EXISTS scores("
    + "id INT(10) NOT NULL AUTO_INCREMENT, "
    + "name varchar(30), "
    + "score INT(6), "
    + "rank INT(4), "
    + "PRIMARY KEY(id));",
    function(err){
      if(err){
        console.log("Could not create database table, is mySQL properly set up?", err);
        dbPingDone = true;
        return;
      }
      console.log("Database table scores created");
      dbSetupDone = true;
      dbPingDone = true;
    }
  );
}

//SERVER ERRORS

function throwInternalError(response){
  response.statusCode = 500;
  response.end("Internal Server Error");
}
function throwNotFoundError(response){
  response.statusCode = 404;
  response.end("File Not Found");
}
