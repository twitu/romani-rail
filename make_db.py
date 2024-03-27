import csv
import sqlite3

# Read the train schedule CSV file
train_schedule_file = 'train_details_2017.csv'
train_schedule_data = []

with open(train_schedule_file, 'r') as f:
    reader = csv.reader(f)
    next(reader)  # Skip the header row
    for row in reader:
        train_schedule_data.append(row)

# Read the station coordinates CSV file
station_coords_file = 'railway_station_coordinates.csv'
station_coords = {}

with open(station_coords_file, 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        code = row['Station Code']
        lat = row['Lat']
        long = row['Long']
        station_coords[code] = (lat, long)

# Create and populate the SQLite database
db_file = 'train_schedule.db'
conn = sqlite3.connect(db_file)
c = conn.cursor()

# Create the tables
c.execute('''CREATE TABLE train_schedule (
                 train_no INT,
                 seq INT,
                 station_code VARCHAR(255),
                 arrival_time TIME,
                 departure_time TIME,
                 distance INT
             )''')

c.execute('''CREATE TABLE stations (
                 station_code VARCHAR(255) PRIMARY KEY,
                 station_name VARCHAR(255),
                 lat FLOAT,
                 long FLOAT
             )''')

c.execute('''CREATE TABLE trains (
                 train_no INT PRIMARY KEY,
                 train_name VARCHAR(255),
                 source_station VARCHAR(255),
                 source_station_name VARCHAR(255),
                 destination_station VARCHAR(255),
                 destination_station_name VARCHAR(255)
             )''')

# Insert data into the tables
for row in train_schedule_data:
    c.execute("INSERT INTO train_schedule VALUES (?, ?, ?, ?, ?, ?)",
              (row[0], row[2], row[3], row[5], row[6], row[7]))

    code = row[3]
    name = row[4]
    if code not in station_coords:
        print(f"No coords for {code}")
        lat = None
        long = None
    else:
        lat, long = station_coords[code]

    c.execute("INSERT OR IGNORE INTO stations VALUES (?, ?, ?, ?)",
              (code, name, lat, long))

    c.execute("INSERT OR IGNORE INTO trains VALUES (?, ?, ?, ?, ?, ?)",
              (row[0], row[1], row[8], row[9], row[10], row[11]))

    print(f"inserted row {row}")

conn.commit()
conn.close()
