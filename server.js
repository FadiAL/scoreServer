var fs = require("fs");
var http = require("http");
var path = require("path");
var qs = require("querystring");
var mime = require("mime");
var express = require("express");
var log = require('morgan');

var mysql = require("mysql");
var cfg = require("./config.json");
var scores;

var app = express();
var db;

createTable();

//SERVER METHODS

app.use(log('dev'));
app.use(express.static(path.join(__dirname, 'client')));
app.get('/', function(req, res, next){
  res.sendFile(path.join(__dirname, 'client/page.html'));
});
app.set('port', 8080);
var server = http.createServer(app);
server.listen(8080);

/*var server = http.createServer(function(request, response){
  if(request.method === "POST"){
    var rBody;
    request.on("data", function(data){
      rBody+=data;
    });
    request.on("end", function(){
      var data = qs.parse(rBody);
      insert(data);
    });
  }
  if(request.url.substr(1) == "list.json"){
    console.log("LIST REQUESTED");
    var body = db.query(
      "SELECT * from scores",
      function(err, row){
        if(err){
          console.log("Error: Could not read from database");
          console.log(err);
          return;
        }
        var data = {"list": row};
        response.setHeader("Content-Length", Buffer.byteLength(JSON.stringify(data)));
        response.writeHead(200, {"Content-Type": mime.getType(request.url)});
        response.write(JSON.stringify(data));
        response.end();
      });
  }
  else if(request.url == "/")
    serveFile("./client/page.html", response);
  else{
    serveFile("." + request.url, response);
  }
});*/

//HELPER FUNCTIONS

function rank2(id, score){
  db.query(
    "SELECT COUNT(*) AS r FROM scores WHERE score > " + score + ";"
  , function(err, data){
    db.query(
      "UPDATE scores SET rank = rank + 1 WHERE score < " + score + ";"
    , function(){
      db.query(
        "UPDATE scores SET rank = " + (data[0].r + 1) + " WHERE id = " + id + ";"
      );
    });
  });
}

function insert(data){
  db.query(
    "INSERT INTO scores (name, score, rank) " +
    "VALUES (?, ?, 0)",
    [data.undefinedperson, data.score], function(err, result){
      if(err){
        console.log("Error: Could not save information to scores");
        console.log(err);
      }
      console.log("Added info");
      rank2(result.insertId, data.score);
    });
}

function createTable(){
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
        return;
      }
      console.log("Database table scores created");
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
