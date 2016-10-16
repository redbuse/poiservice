var sqlite = require('spatialite');
var db = new sqlite.Database('link.sqlite');

//url: "http://here-162155.nitrousapp.com:3000/nodes/list.json?minx="+minx+"&maxx="+maxx+"&miny="+miny+"&maxy="+maxy
//http://here-162155.nitrousapp.com:3000/roadnetwork/link?minx=126.9741139888306&maxx=127.08904128070071&miny=37.22520601822842&maxy=37.289421892371664

var query = "SELECT link_id, road_name FROM link WHERE X(start_point)>126.97411 AND X(start_point)<127.08904 AND Y(start_point) < 37.289422 AND Y(start_point) > 37.225206;";
var start_ts = Date.now();
db.spatialite(function(err){

  db.all(query, function(err, row) {
    var end_ts = Date.now();
    console.log((end_ts-start_ts)+" "+row.length);
    
  });
});
