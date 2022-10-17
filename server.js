require('dotenv').config()
api_key = process.env.TFL_API_KEY;
const axios = require('axios');

const express = require('express');
const app = express();
const port = 3001;

const fs = require('fs');

const { parse } = require('csv-parse/sync');

// TODO handle mode so that it's not hardcoded in the URL
var findUpcomingTrains= async function (departing_station_id, inbound_or_outbound, number_of_trains_to_return, length_of_walk_to_station, mode) {
    try {
	// request = "https://api.tfl.gov.uk/Line/london-overground/Arrivals/" + departing_station_id + "?direction=" + inbound_or_outbound + "&api_key=" + api_key;
	request = "https://api.tfl.gov.uk/Line/" + mode +  " /Arrivals/" + departing_station_id + "?direction=" + inbound_or_outbound + "&api_key=" + api_key;
        response = await axios.get(request);
        //console.log(response.data);
        number_of_trains_returned = 0;
		data_to_return = [];
        for (const result_item of response.data) {
		time_in_minutes_to_arrival = result_item.timeToStation/60;
                time_in_minutes_to_arrival = time_in_minutes_to_arrival.toFixed(0);
                if ((number_of_trains_returned < number_of_trains_to_return) && (time_in_minutes_to_arrival > length_of_walk_to_station)) {
                        data_to_return.push(result_item.destinationName + " in " + time_in_minutes_to_arrival + " minutes");
                        //console.log("Platform: " + result_item.platformName);
			number_of_trains_returned++;
                }
        }
		return data_to_return;
    } catch (err) {
       console.error(err);
    }
}

var findDisruptionfromStation = async function (departing_station_id) {
	try {
		request = "https://api.tfl.gov.uk/StopPoint/" + departing_station_id  + "/Disruption";
		//request = "https://api.tfl.gov.uk/StopPoint/HUBNWD/Disruption" + "&api_key=" + api_key; // replaced by above, as for some reason appending the API key to the URL returns a 404
		response = await axios.get(request);
		if (response.data.length == 0) {
			// console.log("No disruption\n");
			return false;
		} else { // TODO check that this loop references the data returned correctly
			console.log("There's disruption from this station: ");
			console.log(response.data);
			console.log("Name: " + response.data[0].commonName);
			console.log("Description: " + response.data[0].description);
			console.log("Type: " + response.data[0].type);
			console.log("Mode: " + response.data[0].mode);
			console.log("Appearance: " + response.data[0].appearance);
			console.log("Additional information: " + response.data[0].additionalInformation);
			return(response.data);
		}
	}
	catch (err) {
		console.error(err)
	}
}

app.get('/', (req, res) => {
	fs.readFile('speech_test.html', 'utf8', (err, data) => {
                if (err) {
                        console.error(err);
                        return;
                }
                res.send(data);
        });
});

app.get('/getStations', (req, res) => { // returns a list of JSON objects containing: Station, id, modes
	fs.readFile('latest_station_data.csv', 'utf8', (err, data) => {
		if (err) {
			console.error(err);
			return;
		}
		const records = parse(data, {
                columns: true,
                skip_empty_lines: true,
        });
        object_to_return = []
        for (const individual_line of records) {
                object_to_return.push(individual_line);
        }
		res.send(object_to_return);
	});
});

app.get('/disruption', async (req, res) => {
	// disruption_status = await findDisruptionfromStation("HUBNWD");
	disruption_status = await findDisruptionfromStation(req.query.id);
	if (disruption_status != false) {
		res.send(disruption_status);
	} else {
		res.send("No disruption");
	}
});

app.get('/upcoming', async (req, res) => {
	upcoming_trains_for_given_station = await findUpcomingTrains(req.query.id, "inbound", 2, 15, "london-overground");
	res.send(upcoming_trains_for_given_station);
});

app.listen(port, () => {
	console.log('Server is listening on port ' + port);
});