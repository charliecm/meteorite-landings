/**
 * Main Interactions
 */

/* global d3, TrendChart, MassChart */

document.addEventListener('DOMContentLoaded', function() {

	// Data
	var dataURL = 'data.csv',
		trendBins = [
			{
				name: 'observed',
				color: '#F2DD1D'
			},
			{
				name: 'found',
				color: '#59AFFF'
			}
		],
		trendBinActive = '',
		trendChart, massChart,
		trendLegends = document.getElementById('trend-legends'),
		yearStart = 300,
		yearEnd = 2010,
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
			bin,
			items = [],
			item, itemColor, itemLabel,
			update = function() {
				for (var i in items) {
					items[i].classList.toggle('-disabled', !(items[i]._name === trendBinActive || trendBinActive === ''));
				}
			},
			toggle = function() {
				var name = this._name;
				if (trendBinActive === name) {
					trendBinActive = '';
				} else {
					trendBinActive = name;
				}
				trendChart.updateData(trendBinActive);
				massChart.updateData(trendBinActive);
				updateVis();
				update();
			};
		// Add new legends items
		for (var i in bins) {
			bin = bins[i];
			item = document.createElement('li');
			item._name = bins[i].name;
			item.className = 'trend-legends__item ';
			item.addEventListener('click', toggle);
			items.push(item);
			// Color
			itemColor = document.createElement('span');
			itemColor.className = 'trend-legends__color';
			itemColor.style.backgroundColor = bin.color;
			// Label
			itemLabel = document.createElement('span');
			itemLabel.className = 'trend-legends__label';
			itemLabel.textContent = bin.name;
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
		console.log('changed', start, end);
		// TODO: Update mass chart and map
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
				trendChart = new TrendChart(document.getElementById('trend-chart'), d, trendBins, onYearChange);
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
