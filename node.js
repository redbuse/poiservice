var sqlite = require('spatialite');
var db = new sqlite.Database('node.sqlite');

//url: "http://here-162155.nitrousapp.com:3000/nodes/list.json?minx="+minx+"&maxx="+maxx+"&miny="+miny+"&maxy="+maxy
//http://52.79.151.137:3000/nodes/list.json?minx=126.9741139888306&maxx=127.08904128070071&miny=37.22520601822842&maxy=37.289421892371664

var query = "SELECT node_id, node_name, X(CastToPoint(Geometry)) AS lng, Y(CastToPoint(Geometry)) AS lat FROM node WHERE X(Geometry)>126.97411 AND X(Geometry)<127.08904 AND Y(Geometry) < 37.289422 AND Y(Geometry) > 37.225206;";
var start_ts = Date.now();
db.spatialite(function(err){

  db.all(query, function(err, row) {
    var end_ts = Date.now();
    console.log((end_ts-start_ts)+ " "+row.length);
  });
});
