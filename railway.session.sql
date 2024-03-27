WITH evening_trains AS (
  SELECT ts.train_no, tr.train_name, tr.destination_station, ts.departure_time AS start_time, ts.seq AS start_seq, ts.station_code AS start_station
  FROM train_schedule ts
  JOIN trains tr ON ts.train_no = tr.train_no
  WHERE ts.station_code = 
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
