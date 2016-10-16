var sqlite = require('spatialite');
var db = new sqlite.Database('link.sqlite');

//url: "http://here-162155.nitrousapp.com:3000/nodes/list.json?minx="+minx+"&maxx="+maxx+"&miny="+miny+"&maxy="+maxy
//http://here-162155.nitrousapp.com:3000/roadnetwork/link?minx=126.9741139888306&maxx=127.08904128070071&miny=37.22520601822842&maxy=37.289421892371664

var lat = 37.256380761048526;
  var lng = 127.05333207905868
    var minx = eval(lng-0.1);
  var maxx = eval(lng+0.1);
  var miny = eval(lat-0.1);
  var maxy = eval(lat+0.1);

  var geom = "GeomFromText('POINT("+lng+" "+lat+")',4326)";
  var mbr = "BuildCircleMbr("+lng+","+lat+",0.05,4326)";
  var query = "SELECT road_name, max_spd AS slimit, ST_Distance("+geom+",geometry,1) AS dist FROM link WHERE X(start_point)>"+
      minx+" AND X(start_point)<"+maxx+" AND Y(start_point)>"+miny+" AND Y(start_point)<"+maxy+
      " AND ST_Distance(geometry,"+geom+",1) < 50 ORDER BY ST_Distance(geometry,"+geom+",1) LIMIT 1";

console.log(query);
var start_ts = Date.now();
db.spatialite(function(err){

  db.all(query, function(err, row) {
    var end_ts = Date.now();
    console.log(row);
    console.log(end_ts - start_ts);
  });
});
