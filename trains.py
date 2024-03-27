import pandas as pd
import numpy as np
import csv

class Station:
    code_mapping = {}
    route_mapping = {}

    def __init__(self, code, name):
        self.code = code
        self.name = name

        Station.code_mapping[code] = self

        # Special case for shivaji terminus
        if code == "CSMT":
            Station.code_mapping["CSTM"] = self


class Train:
    mapping = {}

    def __init__(self, number, name, src: Station, dst: Station):
        self.number = number
        self.name = name
        self.src = src
        self.dst = dst
        Train.mapping[number] = self

    def add_journey(self, src_code, dst_code):
        Station.route_mapping[src_code] = self
        Station.route_mapping[dst_code] = self


if __name__ == "__main__":
    railway_data = pd.read_csv("./train_details_2017.csv")
    railway_data = railway_data.dropna()

    # Index stations
    for index, row in railway_data.iterrows():
        station_code = row["Station Code"]
        station_name = row["Station Name"]

        # Create a Station object if it doesn't exist yet
        if station_code not in Station.code_mapping:
            Station(station_code, station_name)

    # Index trains
    for index, row in railway_data.iterrows():
        num = row["Train No"]
        name = row["Train Name"]
        src = Station.code_mapping[row["Source Station"]]
        dst = Station.code_mapping[row["Destination Station"]]
        Train(num, name, src, dst)

    print(Train.mapping.__len__())
