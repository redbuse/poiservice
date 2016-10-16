var express = require("express");
var app = express();
var router = express.Router();
var request = require("request");
var uuid = require("node-uuid");

var sqlite = require('spatialite');
var db = new sqlite.Database('db.sqlite');
var dist_db = new sqlite.Database('district.sqlite');
var node_db = new sqlite.Database('node.sqlite');
var link_db = new sqlite.Database('link.sqlite');

var appkey = "4071aa5e-6415-3b44-a139-6c13963c7b83";

router.get('/nearby_parking_lots', function (req, res){
  var endY = req.query.endY;
  var endX = req.query.endX;

  request(
    {
      headers: {'appKey': appkey, 'Accept': 'application/json'},
      url: encodeURI("https://apis.skplanetx.com/tmap/pois/search/around?centerLat="+endY+"&centerLon="+endX+"&count=200&page=1&reqCoordType=WGS84GEO&callback=&multiPoint=&radius=1&categories=주차장&resCoordType=WGS84GEO&version=1")
    }, function(error, response, body){
    if(!error && response.statusCode === 200) {
      var json = JSON.parse(body);
      var request_id = uuid.v1();
      var poi_list = json.searchPoiInfo.pois.poi;
      db.spatialite(function(err){
	db.serialize(function(){
	  db.run("BEGIN TRANSACTION");
          for(var i=0;i<poi_list.length;i++){
            var poi = poi_list[i];
            var name = poi.name;
            var lat = poi.frontLat;
            var lng = poi.frontLon;

            var query = "INSERT INTO parking VALUES(NULL,'"+name+"',GeomFromText('POINT("+lng+" "+lat+")',4326),'"+request_id+"');";
//           console.log(query);
            db.run(query);

          }
          db.run("END", function(err, row){
            console.log("Transaction end");
            var dist_query = "SELECT parking.name AS name, AsText(parking.geometry) AS geom, Distance(parking.geometry, GeomFromText('POINT("+endX+" "+endY+")',4326),1) AS dist FROM parking WHERE request_id = '"+request_id+"' ORDER BY Distance(parking.geometry, GeomFromText('POINT("+endX+" "+endY+")',4326),1) LIMIT 5";
            console.log(dist_query);
            db.all(dist_query, function(err, rows){
              console.log(rows);
              res.json({code:200,parking_lots:rows});
            });
          });
        });
      });
      
    } else {
      console.log(response);
      res.json({code:response.statusCode});
    }
  });
});

router.get('/gas_along_the_route', function(req, res){
  var startY = req.query.startY;
  var startX = req.query.startX;
  var endY = req.query.endY;
  var endX = req.query.endX;
  
  // request tmap route api
  request.post({
    headers: {'content-type' : 'application/x-www-form-urlencoded;charset=utf-8', 'appKey': appkey, 'Accept': 'application/json'},
    url:     'https://apis.skplanetx.com/tmap/routes?callback=&version=1',
    body: "startX="+startX+"&startY="+startY+"&endX="+endX+"&endY="+endY+"&resCoordType=WGS84GEO&reqCoordType=WGS84GEO"
//     body:    "startX=127.048509&startY=37.257830&endX=127.025999&endY=37.497197&resCoordType=WGS84GEO&reqCoordType=WGS84GEO"
  }, function(error, response, body){
    if( response.statusCode == 200 ){
      var route_id = uuid.v1();
      var jsonobj = JSON.parse(body);
//       console.log(jsonobj.type);
      db.spatialite(function(err){
        db.serialize(function(){
          db.run("BEGIN TRANSACTION");
          for(var i=0;i<jsonobj.features.length;i++){
            var feature = jsonobj.features[i];
            if( feature.geometry.type == "LineString" ){
              var geom = JSON.stringify(feature.geometry);
              // geojson to LINESTRING, insert to route table
              var query = "INSERT INTO route VALUES(NULL,NULL,NULL,SetSRID(GeomFromGeoJSON('"+geom+"'),4326),'"+route_id+"');";
              db.run(query);
            }
          }
          db.run("END", function(err, row){
            console.log("Transaction end");
            // calc distance among route and gas stations
            var dist_query = "SELECT gas.PK_UID AS id, AsText(gas.geometry) AS geom, gas._NAME AS name, gas.Address AS addr, Distance(gas.geometry, route.trajectory, 1) AS dist FROM gas, route WHERE route.route_id='"+route_id+"' AND Contains((SELECT Envelope(LineMerge(Collect(route.trajectory))) FROM route WHERE route_id='"+route_id+"'),gas.geometry) ORDER BY Distance(gas.geometry, route.trajectory, 1) LIMIT 5;";
            console.log(dist_query);
            db.all(dist_query, function(err, rows){
              console.log(rows);
              res.json({code:200,gas_stations:rows});
            });
          });
        });
      });
      
    } else {
      res.json({code:response.statusCode});
    }
  });

});

router.get('/poi/gas-station', function(req, res) {
  var lat = req.query.lat;
  var lng = req.query.lng;
  var geom = "GeomFromText('POINT("+lng+" "+lat+")',4326)";
  var dist_query = "SELECT gas.PK_UID AS id, AsText(gas.geometry) AS geom, gas._NAME AS name, gas.Address AS addr, Distance(gas.geometry,"+
      geom+", 1) AS dist FROM gas WHERE Distance(gas.geometry, "+geom+", 1) < 50 ORDER BY Distance(gas.geometry, "+geom+", 1) LIMIT 5;";
  db.spatialite(function(err){
    db.all(dist_query, function(err, rows){
      console.log(rows);
      if(rows.length == 0) {
        res.json({code:204,gas_stations:rows});
      } else {
        res.json({code:200,gas_stations:rows});
      }
    });
  });
});

router.use(function(req, res, next) {
  console.log(req.url);
  res.header("Access-Control-Allow-Origin","*");
  res.header("Access-Control-Allow-Headers","Origin, X-Requested-With, Content-Type, Accept");
  next();
});

router.get("/geocoder/reverse", function(req, res) {
  var geom = "GeomFromText('POINT("+req.query.lng+" "+req.query.lat+")')"
  var query = "SELECT cido.NAME as A1, sig.A2, emd.A2 as A3 FROM cido, sig, emd WHERE ST_Contains(cido.wgs,"+geom+")=1 AND ST_Contains(sig.wgs,"+geom+")=1 AND ST_Contains(emd.wgs,"+geom+")=1";
  console.log(query);
  dist_db.spatialite(function(err){
    dist_db.each(query, function(err, row) {
      res.send(row);
    });
  });
});

router.get("/roadnetwork/node", function(req, res) {
  var x1 = req.query.minx;
  var x2 = req.query.maxx;
  var y1 = req.query.miny;
  var y2 = req.query.maxy;
  
  var geom = "X(geometry)>"+x1+" AND X(geometry)<"+x2+" AND Y(geometry)>"+y1+" AND Y(geometry)<"+y2;
  var query = "SELECT node_id, node_name AS name, X(CastToPoint(Geometry)) AS lng, Y(CastToPoint(Geometry)) AS lat FROM node WHERE node.node_name != '-' AND "+geom+";";
  var start_ts = Date.now();
  console.log(query);
  node_db.spatialite(function(err){
    node_db.all(query, function(err, row) {
      var end_ts = Date.now();
      console.log((end_ts-start_ts)+ " rows fetched : "+row.length);
      res.send(row);
    });
  });
});

router.get("/roadnetwork/link", function(req, res) {
  var x1 = req.query.minx;
  var x2 = req.query.maxx;
  var y1 = req.query.miny;
  var y2 = req.query.maxy;
  
  var geom = "X(start_point)>"+x1+" AND X(start_point)<"+x2+" AND Y(start_point)>"+y1+" AND Y(start_point)<"+y2;
  var query = "SELECT max_spd, road_name, road_type, road_rank, road_no, AsGeoJSON(Simplify(Geometry,0.0001),6) AS route FROM link \
WHERE "+geom+";";
  var start_ts = Date.now();
  console.log(query);
  link_db.spatialite(function(err){
    link_db.all(query, function(err, row) {
      var end_ts = Date.now();
      console.log((end_ts-start_ts)+ " rows fetched : "+row.length);
      res.send(row);
    });
  });
});

router.get("/roadnetwork/nearest", function(req, res) {
  var lat = parseFloat(req.query.lat);
  var lng = parseFloat(req.query.lng);
  var minx = lng-0.1;
  var maxx = lng+0.1;
  var miny = lat-0.1;
  var maxy = lat+0.1;
  
  var geom = "GeomFromText('POINT("+lng+" "+lat+")',4326)";
  var query = "SELECT road_name, max_spd AS slimit, ST_Distance("+geom+",geometry,1) AS dist, \
AsGeoJSON(Simplify(Geometry,0.0001),6) AS route FROM link WHERE X(start_point)>"+
      minx+" AND X(start_point)<"+maxx+" AND Y(start_point)>"+miny+" AND Y(start_point)<"+maxy+
      " AND ST_Distance(geometry,"+geom+",1) < 50 ORDER BY ST_Distance(geometry,"+geom+",1) LIMIT 1";
  
  console.log(query);
  link_db.spatialite(function(err){
    link_db.all(query, function(err, row) {
      console.log(row);
      if(row) {
        res.send({code:200,link:row});
      } else {
        res.send({code:404});
      }
    });
  });
});

app.use("/", router);
app.listen(8080);

