var sqlite = require('spatialite');
var db = new sqlite.Database('db.sqlite');

var query = "SELECT *,AsText(trajectory) FROM route;";
var geometry = '{ "type": "LineString",\
  "coordinates":\
   [ [ 127.02667696847696, 37.495791546738225 ],\
     [ 127.02601587780059, 37.497196927167394 ] ] }';
//INSERT INTO route VALUES(NULL,NULL,NULL,SetSRID(GeomFromGeoJSON('{ "type": "LineString",  "coordinates":   [ [ 127.02667696847696, 37.495791546738225 ],     [ 127.02601587780059, 37.497196927167394 ] ] }'),4326));
// var query = "INSERT INTO route VALUES(NULL,NULL,NULL,SetSRID(GeomFromGeoJSON('"+geometry+"'),4326),'manual_test_1754');";
console.log(query);
db.spatialite(function(err){
  db.all(query, function(err, row){
    console.log("indi");
    console.log(row);
  });
  
/*  db.run("BEGIN TRANSACTION");
  db.run(query);
  db.run(query);
  db.run(query);
  db.run(query);
  db.run("END", function(err, row){
    console.log("Transaction end");
  });
  */
});

db.close();
