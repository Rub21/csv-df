var fs = require('fs');
var csv = require('csv-parser')
var _ = require('underscore');
var OSRM = require('osrm-client');
var osrm = new OSRM("http://router.project-osrm.org/");
var url = "http://map.project-osrm.org/?hl=en&loc=";
var spreadsheets = [];
var world = JSON.parse(fs.readFileSync('world.geojson', 'utf8'));
fs.writeFile("link-routes.csv", "ID | Map evaluation | API evaluation | url_start_via_end |	url_start_via | url_via_end | status | issue description \n", function(err) {});
var rqt = fs.createReadStream('feedbacks.csv')
	.pipe(csv())
	.on('data', function(data) {
		var element = {
			"id": data.id,
			"subject_id": data.subject_id,
			"subject_type": data.subject_type,
			"notes": {},
			"created_at": data.created_at,
			"updated_at": data.updated_at
		};
		var array_notes = data.notes.replace(/\n/g, "*#").split("*#");
		var notes = {
			'Unroutable _Waypoint': array_notes[0].split(":")[1],
			'Type': array_notes[1].split(":")[1],
			'Name': array_notes[2].split(":")[1],
			'ID': array_notes[3].split(":")[1],
			'Location': array_notes[4].split(":")[1].replace("[", "").replace("]", "").replace(" ", "").split(","),
			'Poi': array_notes[5].split(":")[1],
			'Byway': array_notes[6].split(":")[1],
			waypoint_before: {},
			waypoint_after: {}
		};
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
	_.each(spreadsheets, function(element) {
		var coor_start = element.notes.waypoint_before.Location;
		var coor_via = element.notes.Location;
		var coor_end = element.notes.waypoint_after.Location;
		var isrouting_continents = false;
		_.each(world.features, function(val) {
			var v = (coor_start.length > 0 ? pointinpolygon(coor_start, val.geometry.coordinates) : true) && (coor_via.length > 0 ? pointinpolygon(coor_via, val.geometry.coordinates) : true) && (coor_end.length > 0 ? pointinpolygon(coor_end, val.geometry.coordinates) : true);
			isrouting_continents = isrouting_continents || v;
		});

		coor_start = element.notes.waypoint_before.Location.reverse();
		coor_via = element.notes.Location.reverse();
		coor_end = element.notes.waypoint_after.Location.reverse();
		var status = "";
		var routing_continents = "";
		if (!isrouting_continents) {
			routing_continents = "No Routing";
			status = "won't fix";
		}

		var url_routing = "";
		var query = {};
		if (coor_end.length === 0) {
			var url_start_via = url + coor_start + "&loc=" + coor_via;
			url_start_via = '=HYPERLINK("' + url_start_via + '","Start-Via")';
			url_routing = "|-- | " + url_start_via + "|-- ";
			query = {
				coordinates: [
					coor_start,
					coor_via
				]
			};
		} else {
			var url_start_via_end = url + coor_start + "&loc=" + coor_via + "&loc=" + coor_end;
			url_start_via_end = '=HYPERLINK("' + url_start_via_end + '","Start-Via-End")';

			var url_start_via = url + coor_start + "&loc=" + coor_via;
			url_start_via = '=HYPERLINK("' + url_start_via + '","Start-Via")';

			var url_via_end = url + coor_via + "&loc=" + coor_end;
			url_via_end = '=HYPERLINK("' + url_via_end + '","Via-End")';
			url_routing = "| " + url_start_via_end + "| " + url_start_via + "| " + url_via_end;
			query = {
				coordinates: [
					coor_start,
					coor_via,
					coor_end
				]
			};
		}

		osrm.route(query, function(err, result) {
			if (result.route_summary !== undefined) {
				status = "fixed";
				var t = element.id + " | " + routing_continents + "|  Routing  " + url_routing + "| " + status + " | \n";
				fs.appendFile('link-routes.csv', t, function(err) {});
			} else {
				var t = element.id + " | " + routing_continents + "|  No Routing " + url_routing + "| " + status + " | \n";
				fs.appendFile('link-routes.csv', t, function(err) {});
			}
		});
	});
});

function pointinpolygon(point, vs) {
	var x = point[0],
		y = point[1];
	var inside = false;
	for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
		var xi = vs[i][0],
			yi = vs[i][1];
		var xj = vs[j][0],
			yj = vs[j][1];
		var intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
		if (intersect) inside = !inside;
	}
	return inside;
}