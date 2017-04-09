/**
 * Main Interactions
 */

/* global d3, TrendChart, MassChart, mapboxgl */

document.addEventListener('DOMContentLoaded', function() {


	var MAPBOX_API_TOKEN = 'pk.eyJ1IjoiY2hhcmxpZWNtIiwiYSI6ImNpenZ2ZG16cDAxaTMyd2s3b2YzMHpoaDYifQ.IqiI7-yLZR1HWB6MFDD04w',
		MAP_LAYER_ID = 'meteorites',
		MAP_HITBOX_SIZE = 8,
		MAP_ITEMS_CAP = 5;

	var dataURL = 'data.csv',
		bins = [
			{
				name: 'found',
				label: 'Found',
				color: 'rgb(0, 132, 255)'
			},
			{
				name: 'observed',
				label: 'Observed',
				color: 'rgb(255, 146, 0)'
			}
		],
		trendChart, massChart,
		trendLegends = document.getElementById('trend-legends'),
		massRange = document.getElementById('mass-range'),
		mapRange = document.getElementById('map-range'),
		map = null,
		isMapLoaded = false,
		isDataReady = false;

	// https://github.com/jashkenas/underscore/blob/master/underscore.js#L880
	function debounce(func, wait, immediate) {
		var timeout, args, context, timestamp, result;
		var _now = Date.now || function() {
			return new Date().getTime();
		};
		var later = function() {
			var last = _now() - timestamp;
			if (last < wait && last >= 0) {
				timeout = setTimeout(later, wait - last);
			} else {
				timeout = null;
				if (!immediate) {
					result = func.apply(context, args);
					if (!timeout) context = args = null;
				}
			}
		};
		return function() {
			context = this;
			args = arguments;
			timestamp = _now();
			var callNow = immediate && !timeout;
			if (!timeout) timeout = setTimeout(later, wait);
			if (callNow) {
				result = func.apply(context, args);
				context = args = null;
			}
			return result;
		};
	}

	/**
	 * Updates the legends list.
	 */
	function updateLegends() {
		var bin,
			items = [],
			item, itemColor, itemLabel;
		// Add new legends items
		for (var i in bins) {
			bin = bins[i];
			item = document.createElement('li');
			item.className = 'trend-legends__item';
			items.push(item);
			// Color
			itemColor = document.createElement('span');
			itemColor.className = 'trend-legends__color';
			itemColor.style.backgroundColor = bin.color;
			// Label
			itemLabel = document.createElement('span');
			itemLabel.className = 'trend-legends__label';
			itemLabel.textContent = bin.label;
			// Append
			item.appendChild(itemColor);
			item.appendChild(itemLabel);
			trendLegends.appendChild(item);
		}
	}

	/**
	 * Updates visualizations.
	 * @param {boolean} isInit If true, skip transitions.
	 */
	function updateVis(isInit) {
		if (!isDataReady) return;
		trendChart.update(isInit);
		massChart.update(isInit);
	}

	/**
	 * Handles year range change.
	 * @param {number} start Start year.
	 * @param {number} end End year.
	 */
	function onYearChange(start, end) {
		var yearRange = '';
		if ((end - 9) === start) {
			yearRange = 'during the ' + start + 's';
		} else {
			yearRange = 'from ' + start + 's to ' + end + 's';
		}
		massRange.textContent = yearRange;
		mapRange.textContent = yearRange;
		if (isMapLoaded) {
			updateMap(start, end);
		}
		massChart.updateData(start, end);
		massChart.update();
	}

	/**
	 * Updates the map with new dataset.
	 * @param {number} start Start year.
	 * @param {number} end End year.
	 */
	function updateMap(yearStart, yearEnd) {
		map.setFilter(MAP_LAYER_ID, [ 'all',
			[ '>=', 'year', yearStart ],
			[ '<=', 'year', yearEnd ]
		]);
	}

	/**
	 * Initializes the Mapbox instance.
	 */
	function initMap(massMin, massMax, yearStart, yearEnd) {
		mapboxgl.accessToken = MAPBOX_API_TOKEN;
		map = new mapboxgl.Map({
			container: 'map',
			style: 'mapbox://styles/charliecm/cj19p943000322rqls7wc2x3l',
			center: [ -20, 8 ],
			zoom: 2,
			minZoom: 2,
			scrollZoom: false
		});
		// Navigation control
		var nav = new mapboxgl.NavigationControl();
		map.addControl(nav, 'bottom-right');
		// Create a popup, but don't add it to the map yet.
		var popup = new mapboxgl.Popup({
			closeButton: false,
			closeOnClick: false
		});
		map.on('load', function () {
			isMapLoaded = true;
			// Add data layer
			map.addLayer({
				id: MAP_LAYER_ID,
				type: 'circle',
				source: {
					type: 'vector',
					url: 'mapbox://charliecm.56naccdu'
				},
				'source-layer': 'meteorite_landings-b4nxia',
				paint: {
					'circle-radius': {
						property: 'mass',
						stops: [
							[ { zoom: 2, value: massMin }, 1.5 ],
							[ { zoom: 2, value: massMax }, 24 ],
							[ { zoom: 16, value: massMin }, 6 ],
							[ { zoom: 16, value: massMax }, 240 ]
						]
					},
					'circle-color': {
						property: 'discovery',
						type: 'categorical',
						stops: [
							[ bins[0].name, bins[0].color ],
							[ bins[1].name, bins[1].color ]
						]
					},
					'circle-opacity': 0.72
				}
			});
			map.on('mousemove', function (e) {
				var p = e.point,
					s = MAP_HITBOX_SIZE,
					cap = MAP_ITEMS_CAP,
					features = map.queryRenderedFeatures([[p.x - s, p.y - s], [p.x + s, p.y + s]], {
						layers: [ MAP_LAYER_ID ]
					}),
					count = features.length,
					output = '<table class="map__tip-table"><thead><tr>' +
						'<td>Year</td><td>Mass</td><td>Name</td>' +
						'</tr></thead><tbody>';
				if (popup.isOpen()) {
					// Hide tooltip
					popup.remove();
				}
				if (!count) return;
				// Populate tooltip content
				for (var i = 0; i < Math.min(count, cap); i++) {
					var f = features[i],
						props = f.properties,
						year = props.year,
						mass = props.mass ? (d3.format('.0s')(props.mass) + 'g') : 'Unknown',
						name = props.name;
					output += '<tr><td class="number">' + year + '</td>' +
						'<td class="number">' + mass + '</td>' +
						'<td>' + name + '</td></tr>';
				}
				if (count > cap) {
					output += '<tr><td colspan="3">' + (count - cap) + ' more...</td></tr>';
				}
				output += '</tbody></table>';
				// Show tooltip
				popup.setLngLat(features[0].geometry.coordinates)
					.setHTML(output)
					.addTo(map);
			});
			updateMap(yearStart, yearEnd);
		});
	}

	/**
	 * Fetches and parses the data.
	 */
	function fetch() {
		d3.csv(dataURL)
			.row(function(d) {
				return {
					year: +d['year'],
					mass: +d['mass'],
					discovery: d['discovery'],
					lat: +d['lat'],
					lng: +d['lng']
				};
			})
			.get(function(d) {
				isDataReady = true;
				// Initialize charts
				trendChart = new TrendChart(document.getElementById('trend-chart'), d, bins, onYearChange);
				massChart = new MassChart(document.getElementById('mass-chart'), d);
				window.addEventListener('resize', debounce(function() {
					updateVis();
				}, 500));
				updateVis(true);
				// Initialize map
				var year = trendChart.getYearRange(),
					mass = massChart.getExtent();
				initMap(mass[0], mass[1], year[0], year[1]);
			});
	}

	// Get the ball rolling...
	updateLegends();
	fetch();

});
