// Load sql.js WebAssembly file
let config = {
  locateFile: () => "/node_modules/sql.js/dist/sql-wasm.wasm",
};


function dstStnQry(srcStn) {
  return `
WITH evening_trains AS (
  SELECT ts.train_no, tr.train_name, tr.destination_station, ts.departure_time AS start_time, ts.seq AS start_seq, ts.station_code AS start_station
  FROM train_schedule ts
  JOIN trains tr ON ts.train_no = tr.train_no
  WHERE ts.station_code = "${srcStn}"
    AND ts.departure_time BETWEEN '19:00:00' AND '22:00:00'
),
morning_stations AS (
  SELECT ts.train_no, ts.station_code, ts.arrival_time AS end_time, ts.seq AS end_seq
  FROM train_schedule ts
  WHERE ts.arrival_time BETWEEN '06:00:00' AND '10:00:00'
),
trains_with_travel_time AS (
  SELECT et.train_no, et.train_name, et.destination_station, et.start_time, et.start_seq, et.start_station, ms.station_code, ms.end_time, ms.end_seq,
    (strftime('%s', ms.end_time) - strftime('%s', et.start_time) +
      (CASE WHEN ms.end_time < et.start_time THEN 86400 ELSE 0 END)) / 3600.0 AS travel_time
  FROM morning_stations ms
  JOIN evening_trains et ON ms.train_no = et.train_no AND ms.end_seq > et.start_seq
),
final_result AS (
  SELECT DISTINCT twtt.station_code, twtt.train_no, twtt.train_name, twtt.destination_station, twtt.start_station
  FROM trains_with_travel_time twtt
  WHERE twtt.travel_time BETWEEN 6 AND 10
  ORDER BY twtt.station_code
)

SELECT fr.train_no, fr.start_station AS "Starting Station", s.station_code AS "Station Code", s.station_name AS "Station Name", s.lat AS Latitude, s.long AS Longitude
FROM final_result fr
JOIN stations s ON fr.station_code = s.station_code AND s.lat IS NOT NULL AND s.long IS NOT NULL
ORDER BY fr.station_code;
`
}

var northEastBounds = L.latLng(35.6573, 112.17041),
  southWestBounds = L.latLng(7.99396, 49.94385),
  bounds = L.latLngBounds(southWestBounds, northEastBounds);

let map = L.map('map', {
  minZoom: 5,
  maxZoom: 13,
  maxBounds: bounds,
}).fitBounds(bounds).setZoom(5);

// var map = L.map('map').setView([51.505, -0.09], 13);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">Blah</a>'
}).addTo(map);

// var searchLayer = L.layerGroup().addTo(map);
// searchLayer.searchText = (text) => {
//   run_query(text)
// }

//... adding data in searchLayer ...
// map.addControl( new L.Control.Search({layer: searchLayer}) );
let db;
async function main() {
  let SQL = await Promise.resolve(initSqlJs(config));
  console.log("sql.js initialized 🎉");
  console.log("here");
  const buf = await Promise.resolve(fetch("http://127.0.0.1:4000/train_schedule.db").then(res => res.arrayBuffer()));
  console.log("Create db");
  db = new SQL.Database(new Uint8Array(buf));
  document.getElementById("srcStationInput").addEventListener('click', function(e) {
    if (e.currentTarget.value !== "") {
      run_query(e.currentTarget.value);
    }
  })
}

await main();
// run_query("HWH")

function run_query(sourceStation) {
  const query_result = db.exec(dstStnQry(sourceStation));
  console.log(query_result);
  console.log(query_result[0]['columns'])
  console.table(query_result[0]['values'])
  for (const station of Object.values(query_result[0]['values'])) {
    console.log(station)
    show_station(station)
  }
  showSourceStation()
}

function show_station(station) {
  let train_name;
  let marker = L.marker(station.slice(4, 6))
    .addTo(map)
    .bindPopup("")

  marker.on('click', function (e) {
    var name = db.exec(`SELECT train_name from trains where train_no == ${station[0]}`)
    console.log(name[0])
    console.log(name[0]['values'][0][0]);
    train_name = name[0]['values'][0][0];
    let popup = e.target.getPopup();
    // let chart_div = document.getElementById("graphdiv");
    popup.setContent(train_name);
  })
}

function showSourceStation() {
  let marker = L.marker([22.584613, 88.339366])
    .bindPopup("Station HWH")
    .addTo(map)
  // .on('click', function(e) {
  //   console.log(e.latlng);
  // });
  marker._icon.classList.add("huechange");
}
