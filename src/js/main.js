/**
 * Main Interactions
 */

/* global d3 */

document.addEventListener('DOMContentLoaded', function() {

	// Data
	var data,
		dataURL = 'meteorite-landings.csv';

	// UI
	var canvas = document.getElementById('canvas'),
		svg = d3.select(canvas).append('svg');

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

	// TODO: Setup visualization canvas
	function setupVis() {
	}

	// TODO: Draws the visualization
	function redraw() {

		var outerWidth = canvas.clientWidth,
			outerHeight = canvas.clientHeight;

		// Resize canvas
		svg.attrs({
			class: 'chart',
			width: outerWidth,
			height: outerHeight
		});

	}

	// Fetches and parses the data
	function fetch() {
		d3.csv(dataURL)
			.row(function(d) {
				// TODO: Data
				return d;
			})
			.get(function(d) {
				data = d;
				setupVis();
				redraw(true);
				window.addEventListener('resize', debounce(redraw, 500));
			});
	}

	// Get the ball rolling...
	fetch();

});
