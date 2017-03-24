/**
 * Main Interactions
 */

/* global d3, TrendChart, MassChart */

document.addEventListener('DOMContentLoaded', function() {

	// Data
	var dataURL = 'data.csv',
		trendBins = [
			{
				name: 'Found',
				color: 'red',
				isEnabled: true
			},
			{
				name: 'Observed',
				color: 'blue',
				isEnabled: true
			}
		],
		trendChart, massChart,
		trendLegends = document.getElementById('trend-legends'),
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
		var bins = trendBins,
			data, item, itemColor, itemLabel,
			toggle = function() {
				var isEnabled = this._data.isEnabled = !this._data.isEnabled;
				this.classList.toggle('-disabled', !isEnabled);
				updateVis();
			};
		// Add new legends items
		for (var i in bins) {
			item = document.createElement('li');
			data = item._data = bins[i];
			item.className = 'trend-legends__item ' + (data.isEnabled ? '' : '-disabled');
			item.addEventListener('click', toggle);
			// Color
			itemColor = document.createElement('span');
			itemColor.className = 'trend-legends__color';
			itemColor.style.backgroundColor = data.color;
			// Label
			itemLabel = document.createElement('span');
			itemLabel.className = 'trend-legends__label';
			itemLabel.textContent = data.name;
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
				trendChart = new TrendChart(document.getElementById('trend-chart'), d, trendBins);
				massChart = new MassChart(document.getElementById('mass-chart'), d);
				isDataReady = true;
				window.addEventListener('resize', debounce(updateVis, 500));
				updateVis(true);
			});
	}

	// Get the ball rolling...
	updateLegends();
	fetch();

});
