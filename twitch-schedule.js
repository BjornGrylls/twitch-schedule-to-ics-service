// Scrapes a twitch streamers schedule and generates an ics

const icalToolkit = require('ical-toolkit');
const axios = require('axios');
const fs = require('fs');

var builder = icalToolkit.createIcsFileBuilder();
builder.spacers = true; //Add space in ICS file, better human reading. Default: true
builder.NEWLINE_CHAR = '\n'; //Newline char to use.
builder.throwError = false; //If true throws errors, else returns error when you do .toString() to generate the file contents.
builder.ignoreTZIDMismatch = true; //If TZID is invalid, ignore or not to ignore!
builder.calname = 'Twitch';
builder.method = 'REQUEST';


async function getSchedule(channelName, callback) {
	return callback(axios.post('https://gql.twitch.tv/gql', '[{"operationName":"StreamSchedule","variables":{"login":"' + channelName + '","startingWeekday":"MONDAY","utcOffsetMinutes":120},"extensions":{"persistedQuery":{"version":1,"sha256Hash":"d77c052e84dfeb3ca1c3633b41cda0fa988577a56c519f43d3142bc99de83ac5"}}}]', { headers: { "Client-Id": "kimne78kx3ncx6brgo4mv6wki5h1ko" } })
		.then((res) => {
			let schedule = res.data[0]["data"]["user"]["channel"]["schedule"]
			let segments = schedule["segments"]

			let nextStart = new Date(schedule["nextSegment"]["startAt"])
			let interruption = schedule["interruption"]
			var interruptionStart = new Date()
			var interruptionEnd = new Date()

			if (interruption) {
				interruptionStart = new Date(interruption["startAt"])
				interruptionEnd = new Date(interruption["endAt"])
			}

			segments.map(segment => {
				let startDate = new Date(segment["startAt"])
				let endDate = new Date(segment["endAt"])

				var title = segment["title"]
				if (title == "") {
					if (segment["categories"].length > 0) {
						title = segment["categories"][0]["name"]
					} else {
						title = "Stream"
					}
				}

				if (segment["isCancelled"]) {
					title = title + "(Cancelled)"
				}

				if (!interruption || !(startDate >= interruptionStart && endDate <= interruptionEnd)) {
					builder.events.push({
						start: startDate,
						end: endDate,
						summary: title,
						location: 'http://twitch.tv/' + channelName,
						url: 'http://twitch.tv/' + channelName
					});
				}

			})

		}).catch((err) => {
			console.error(err);
		}));
}



const http = require('http');

http.createServer(async (req, res) => {
	builder.events = []

	const getSchedule1 = (channelName) => new Promise(resolve => getSchedule(
        channelName,
        function(res) { resolve(res); }));

	result = await getSchedule1("warframe")
	//res.toString()

	result = await getSchedule1("warframeinternational")
	//res.toString()

	var icsFileContent = builder.toString();

	res.writeHead(200, { 'Content-Type': 'text/plain' });
	res.write(icsFileContent);
	res.end();

}).listen(process.env.PORT || 8080);