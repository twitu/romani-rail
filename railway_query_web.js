// Load sql.js WebAssembly file
let config = {
  locateFile: () => "/node_modules/sql.js/dist/sql-wasm.wasm",
};


function trainRouteQuery(trainCode) {
  return `
SELECT train_schedule.station_code, stations.lat, stations.long
FROM train_schedule
JOIN stations ON train_schedule.station_code = stations.station_code
WHERE train_schedule.train_no = ${trainCode} AND lat is NOT NULL
ORDER BY train_schedule.seq ASC;
`
}

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

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">Blah</a>'
}).addTo(map);

const input = document.getElementById('srcStationInput');
const suggestions = document.getElementById('suggestions');
const submitBtn = document.getElementById('submit');

function showSuggestions() {
  const value = input.value;
  if (!value) {
    suggestions.style.display = 'none';
    return;
  }

  let data = db.exec(`SELECT station_name, station_code FROM stations WHERE station_name LIKE "%${value.toUpperCase()}%" AND lat IS NOT NULL LIMIT 7`)
  const matchedCities = Object.values(data[0]['values'])

  suggestions.innerHTML = '';
  matchedCities.forEach(city => {
    const div = document.createElement('div');
    div.textContent = city;
    div.classList.add('suggestion');
    div.onclick = () => {
      input.value = `${city[0]} (${city[1]})`;
      suggestions.style.display = 'none';
      input.dataset.stnCode = city[1]
    };
    suggestions.appendChild(div);
  });

  suggestions.style.display = matchedCities.length ? 'block' : 'none';
  console.log(suggestions.style.display)
}


//... adding data in searchLayer ...
// map.addControl( new L.Control.Search({layer: searchLayer}) );
let db;
let markerGroup = [];
let timer = null;

function restartTimer() {
  clearTimeout(timer);
  timer = setTimeout(showSuggestions, 300);
}

async function main() {
  let SQL = await Promise.resolve(initSqlJs(config));
  console.log("sql.js initialized 🎉");
  console.log("here");
  const buf = await Promise.resolve(fetch("http://127.0.0.1:4000/train_schedule.db").then(res => res.arrayBuffer()));
  console.log("Create db");
  db = new SQL.Database(new Uint8Array(buf));
  let input = document.getElementById("srcStationInput")
  submitBtn.addEventListener('click', function (e) {
    run_query(input.dataset.stnCode)
  })

  input.addEventListener('input', restartTimer);
  input.addEventListener('blur', () => setTimeout(() => (suggestions.style.display = 'none'), 200));
}

await main();
// run_query("HWH")

function run_query(sourceStation) {
  // clear previous markerGroup before running a query
  for (const marker of markerGroup) {
    map.removeLayer(marker)
  }

  const query_result = db.exec(dstStnQry(sourceStation));
  console.log(query_result);
  console.log(query_result[0]['columns'])
  console.table(query_result[0]['values'])
  for (const station of Object.values(query_result[0]['values'])) {
    console.log(station)
    markerGroup.push(show_station(station, sourceStation))
  }
  markerGroup.push(showSourceStation(sourceStation))
}

function show_station(station, startStation) {
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
    showTrainRoute(station[0], startStation, station[2])
  })
  
  marker.getElement().dataset.stnCode = station[2]

  return marker
}

function showSourceStation(stnCode) {
  let data = db.exec(`select station_name, lat, long from stations where station_code == "${stnCode}"`)
  data = data[0]['values'][0]
  let marker = L.marker(data.slice(1, 3))
    .bindPopup(data[0])
    .addTo(map)

  marker._icon.classList.add("huechange");
  marker.getElement().dataset.stnCode = stnCode

  return marker
}


function showTrainRoute(trainCode, startStation, endStation) {
  let data = db.exec(trainRouteQuery(trainCode))
  data = data[0]['values']
  let points = []
  let takePoints = false

  for (const stn of Object.values(data)) {
    if (stn[0] === startStation) {
      takePoints = true
    }

    if (takePoints === true) {
      points.push(stn.slice(1, 3))
    }

    if (takePoints === true && stn[0] === endStation) {
      takePoints = false
    }
  }
  
  for (const marker of markerGroup) {
    if (![startStation, endStation].includes(marker.getElement().dataset.stnCode)) {
      marker.getElement().style.opacity = 0.5
    }
  }

  let line = L.polyline(points, {
    color: 'red',
    weight: 3,
    opacity: 0.5,
    smoothFactor: 1
  })
  line.addTo(map);
}
