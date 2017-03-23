/**
 * Main Interactions
 */

/* global d3 */

document.addEventListener('DOMContentLoaded', function() {

	// Data
	var data,
		dataURL = 'data.csv',
		yMax = 0;

	// UI
	var canvas = document.getElementById('trend-chart'),
		svg = d3.select(canvas).append('svg'),
		gBars,
		dimSelect = document.getElementById('trend-dimension'),
		isInitialized = false;

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

	// Resize select box to selected option size
	function resizeSelect(ele) {
		var select = document.createElement('select'),
			option = document.createElement('option');
		select.className = ele.className;
		select.style.width = 'auto';
		option.textContent = ele.options[ele.selectedIndex].text;
		select.appendChild(option);
		document.body.appendChild(select);
		ele.style.width = select.clientWidth + 'px';
		select.parentNode.removeChild(select);
	}

	// TODO: Setup visualization canvas
	function setupVis() {
		gBars = svg.append('g');
	}

	function updateLegends() {

	}

	// Draws the visualization
	function redraw(isInit) {

		if (!isInitialized) return;

		var outerWidth = canvas.clientWidth,
			outerHeight = 400, //canvas.clientHeight,
			xScale = d3.scaleBand()
				.rangeRound([ 0, outerWidth ])
				// .padding(0.05)
				.domain(data.map(function(d) {
					return d.year;
				})),
			yScale = d3.scaleLinear()
				.range([ 0, outerHeight ])
				.domain([ 0, yMax ]);

		// Resize canvas
		svg.attrs({
			class: 'chart',
			width: outerWidth,
			height: outerHeight
		});

		gBars.selectAll('rect')
			.data(data)
			.enter()
				.append('rect')
				.attrs({
					width: function(d) {
						return xScale.bandwidth();
					},
					height: function(d) {
						return yScale(d.mass);
					},
					x: function(d, i) {
						return xScale(d.year);
					},
					y: function(d) {
						return outerHeight - yScale(d.mass);
					}
				});

	}

	// Fetches and parses the data
	function fetch() {
		d3.csv(dataURL)
			.row(function(d) {
				var mass = +d['mass'];
				if (mass > yMax) {
					yMax = mass;
				}
				return {
					mass: mass,
					discovery: d['fall'],
					year: +d['year'],
					long: +d['reclong'],
					lat: +d['reclat']
				};
			})
			.get(function(d) {
				data = d.filter(function(d) {
					if (d.year > 2015) {
						return false;
					}
					return true;
				});
				setupVis();
				return;
				redraw(true);
				window.addEventListener('resize', debounce(redraw, 500));
				isInitialized = true;
			});
	}

	// Setup dimension select box
	dimSelect.addEventListener('change', function() {
		resizeSelect(this);
		redraw();
	});
	resizeSelect(dimSelect);

	// Get the ball rolling...
	fetch();

});
