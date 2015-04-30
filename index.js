var fs = require('fs');
var csv = require('csv-parser')
var _ = require('underscore');
var OSRM = require('osrm-client');
var osrm = new OSRM("http://router.project-osrm.org/");

var spreadsheets = [];
var rqt = fs.createReadStream('feedbacks.csv')
	.pipe(csv())
	.on('data', function(data) {
		//console.log(data.id);
		var element = {
			"id": data.id,
			"subject_id": data.subject_id,
			"subject_type": data.subject_type,
			"notes": {},
			"created_at": data.created_at,
			"updated_at": data.updated_at
		}
		var array_notes = data.notes.replace(/\n/g, "*#").split("*#");
		//console.log(array_notes);
		var notes = {
			'Unroutable _Waypoint': array_notes[0].split(":")[1],
			'Type': array_notes[1].split(":")[1],
			'Name': array_notes[2].split(":")[1],
			'ID': array_notes[3].split(":")[1],
			'Location': array_notes[4].split(":")[1],
			'Poi': array_notes[5].split(":")[1],
			'Byway': array_notes[6].split(":")[1],
			waypoint_before: {},
			waypoint_after: {}
		}
		var waypoint_before = {
			'Type': null,
			'Name': null,
			'ID': null,
			'Location': [],
			'Poi': null,
			'Byway': null
		};
		var waypoint_after = {
			'Type': null,
			'Name': null,
			'ID': null,
			'Location': [],
			'Poi': null,
			'Byway': null
		};
		for (var i = 7; i <= 13; i++) {
			if (array_notes[i] !== undefined) {
				var arr = array_notes[i].split(":");
				if (arr.length > 1) {

					if (i === 11) {
						waypoint_before[arr[0].toString()] = arr[1].replace("[", "").replace("]", "").replace(" ", "").split(",");

					} else {
						waypoint_before[arr[0].toString()] = arr[1];
					}
				}
			}
		}

		for (var i = 14; i <= 20; i++) {
			if (array_notes[i] !== undefined) {
				var arr = array_notes[i].split(":");
				if (arr.length > 1) {
					if (i === 18) {
						waypoint_after[arr[0].toString()] = arr[1].replace("[", "").replace("]", "").replace(" ", "").split(",");

					} else {
						waypoint_after[arr[0].toString()] = arr[1];
					}
				}
			}
		}
		notes.waypoint_before = waypoint_before;
		notes.waypoint_after = waypoint_after;
		element.notes = notes;
		spreadsheets.push(element);
	});

rqt.on('finish', function() {
	//console.log(spreadsheets);

	_.each(spreadsheets, function(element) {
		var coor_start = element.notes.waypoint_before.Location.reverse().toString();
		var coor_end = element.notes.waypoint_after.Location.reverse().toString();
		var url = "http://map.project-osrm.org/?hl=de&loc=" + coor_start + "&loc=" + coor_end;
		console.log(element.id + ", " + url);

	});


});