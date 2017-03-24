/**
 * Main Interactions
 */

/* global d3 */

document.addEventListener('DOMContentLoaded', function() {

	// Data
	var data,
		dataURL = 'data.csv',
		dimensions = {
			mass: {
				name: 'Mass',
				bins: [
					{
						color: 'red',
						name: '0-200',
						isEnabled: true
					},
					{
						color: 'blue',
						name: '201-400',
						isEnabled: true
					}
				]
			},
			discovery: {
				name: 'Discovery Type',
				bins: [
					{
						color: 'red',
						name: 'Found',
						isEnabled: true
					},
					{
						color: 'blue',
						name: 'Observed',
						isEnabled: true
					}
				]
			}
		},
		yMax = 0;

	// UI
	var eleLegends = document.getElementById('trend-legends'),
		eleChart = document.getElementById('trend-chart'),
		svg = d3.select(eleChart).append('svg'),
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

	/**
	 * Remove all children from a node.
	 * @param {Node} node Element node.
	 */
	function emptyNode(node) {
		while (node.firstChild) {
			node.removeChild(node.firstChild);
		}
	}

	/**
	 * Resizes a select box to selected option size.
	 * @param {HTMLSelectElement} ele Select box element.
	 */
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

	/**
	 * Updates the legends list.
	 */
	function updateLegends() {
		var dimension = dimSelect.options[dimSelect.selectedIndex].value,
			bins = dimensions[dimension].bins,
			data, item, itemColor, itemLabel,
			toggle = function() {
				var isEnabled = this._data.isEnabled = !this._data.isEnabled;
				this.classList.toggle('-disabled', !isEnabled);
				redraw();
			};
		// Clear legends items
		while (eleLegends.firstChild) {
			eleLegends.firstChild.removeEventListener('click', toggle);
			eleLegends.removeChild(eleLegends.firstChild);
		}
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
			eleLegends.appendChild(item);
		}
	}

	/**
	 * TODO: Setups structure of trend chart.
	 */
	function setupVis() {
		gBars = svg.append('g');
	}

	/**
	 * Draws the visualization.
	 * @param {boolean} isInit If true, skip transitions.
	 */
	function redraw(isInit) {

		if (!isInitialized) return;

		var outerWidth = eleChart.clientWidth,
			outerHeight = eleChart.clientHeight,
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

	/**
	 * Fetches and parses the data.
	 */
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
					// TODO: Change threshold to 2015
					if (d.year > 1000) {
						return false;
					}
					return true;
				});
				isInitialized = true;
				window.addEventListener('resize', debounce(redraw, 500));
				redraw(true);
			});
	}

	/**
	 * Setups UI layout and interactivity.
	 */
	function setupUI() {

		// Setup dimension select box
		(function populateDimensionSelect() {
			var option;
			for (var id in dimensions) {
				option = document.createElement('option');
				option.value = id;
				option.textContent = dimensions[id].name;
				dimSelect.appendChild(option);
			}
		})();
		dimSelect.addEventListener('change', function() {
			resizeSelect(this);
			updateLegends();
			redraw();
		});
		resizeSelect(dimSelect);

		updateLegends();
		setupVis();

	}

	// Get the ball rolling...
	setupUI();
	fetch();

});
