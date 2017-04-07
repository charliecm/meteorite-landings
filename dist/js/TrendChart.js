/**
 *  Trend Chart
 *  Displays a stacked bar graph of meteorites count across years, grouped by
 *  discovery type.
 */

/* global d3 */

(function() {

	var MARGIN = {
		top: 24,
		left: 32,
		right: 32,
		bottom: 80
	};

	/**
	 * Creates a new instance of TrendChart.
	 * @param {HTMLElement} ele Container element to inject into.
	 * @param {Array} data Chart data.
	 * @param {Object} bins Name and colors mapped to series.
	 * @param {function} onYearChange Callback when year range has changed.
	 */
	function TrendChart(ele, data, bins, onYearChange) {
		var counts = {};
		this.ele = ele;
		this.onYearChange = onYearChange || function(){};
		this.xScale = null;
		this.qScale = null;
		// Parse data
		data.forEach(function(d) {
			var decade = (Math.floor(+d.year / 10) * 10) + 's';
			if (!counts.hasOwnProperty(decade)) {
				counts[decade] = {
					year: decade,
					observed: 0,
					found: 0
				};
			}
			counts[decade][d.discovery]++;
		});
		this.data = Object.values(counts);
		var keys = Object.keys(counts);
		this.xMin = keys[0];
		this.xMax = keys[keys.length - 1];
		this.y0Max = d3.max(this.data, function(d) {
			return d.observed;
		});
		this.y1Max = d3.max(this.data, function(d) {
			return d.found;
		});
		// Setup layout elements
		this.svg = d3.select(ele).append('svg');
		this.gWrap = this.svg.append('g');
		this.gWrap.attr('transform', 'translate(' + MARGIN.left + ',' + MARGIN.top + ')');
		var highlight = this.highlight = this.gWrap.append('rect')
			.attr('class', 'highlight');
		this.gXAxis = this.gWrap.append('g').attr('class', 'x-axis');
		this.gXAxis.append('text')
			.attr('class', 'label')
			.style('text-anchor', 'middle')
			.text('Year (by decades)');
		this.gY0Axis = this.gWrap.append('g').attr('class', 'y-axis');
		this.gY1Axis = this.gWrap.append('g').attr('class', 'y-axis');
		this.gBars = this.gWrap.append('g').attr('class', 'bars');
		// Create range slider
		var knobA = this.knobA = document.createElement('div');
		var knobB = this.knobB = document.createElement('div');
		knobA.className = knobB.className = 'trend-knob';
		ele.append(knobA);
		ele.append(knobB);
		this.knobActive = null;
		knobA.addEventListener('mousedown', function() {
			this.knobActive = knobA;
		}.bind(this));
		knobB.addEventListener('mousedown', function() {
			this.knobActive = knobB;
		}.bind(this));
		// Drag move - update knobs label and highlight
		document.addEventListener('mousemove', function(event) {
			var knob = this.knobActive;
			if (!knob) return;
			var bound = ele.getBoundingClientRect(),
				offsetX = knob.clientWidth / 2,
				bandwidth = this.xScale.bandwidth(),
				xMin = (knob === knobB) ? getKnobX(knobA) + bound.left + bandwidth * 1.25 : bound.left - offsetX + MARGIN.left,
				xMax = (knob === knobA) ? getKnobX(knobB) + bound.left - bandwidth / 2 : bound.right - offsetX - MARGIN.right,
				x = Math.min(Math.max(event.pageX - offsetX, xMin), xMax) - bound.left,
				year = this.qScale(x - bandwidth / 2);
			knob.style.transform = 'translate(' + x + 'px,50%)';
			knob.textContent = year;
			highlight
				.attr('x', getKnobX(knobA))
				.attr('width', getKnobX(knobB) - getKnobX(knobA));
			event.preventDefault();
		}.bind(this));
		// Drag release - snap to nearest year band
		document.addEventListener('mouseup', function() {
			var knob = this.knobActive;
			if (!knob) return;
			var bound = ele.getBoundingClientRect(),
				offsetX = knob.clientWidth / 2,
				xScale = this.xScale,
				bandwidth = xScale.bandwidth(),
				xMin = (knob === knobB) ? getKnobX(knobA) + bound.left + bandwidth * 1.25 : bound.left - offsetX + MARGIN.left,
				xMax = (knob === knobA) ? getKnobX(knobB) + bound.left - bandwidth / 2 : bound.right - offsetX - MARGIN.right,
				x = Math.min(Math.max(event.pageX - offsetX, xMin), xMax) - bound.left,
				year = this.qScale(x - bandwidth / 2),
				endX = xScale(year) + bandwidth / 2;
			if (knob === knobB) {
				endX += bandwidth;
			}
			knob.style.transform = 'translate(' + endX + 'px,50%)';
			knob.textContent = year;
			highlight
				.attr('x', getKnobX(knobA))
				.attr('width', getKnobX(knobB) - getKnobX(knobA));
			this.knobActive = null;
			this.onYearChange(parseInt(knobA.textContent, 10), parseInt(knobB.textContent, 10));
		}.bind(this));
		// Add bin colors
		this.colors = [];
		for (var i in bins) {
			this.colors[bins[i].name] = bins[i].color;
		}
	}

	/**
	 * Gets the knob position mapped to highlight boundary..
	 * @param {HTMLElement} knob Knob element.
	 * @return {number} Knob x-position.
	 */
	function getKnobX(knob) {
		var bound = knob.parentNode.getBoundingClientRect();
		return knob.getBoundingClientRect().left + knob.clientWidth / 2 - bound.left - MARGIN.left;
	}

	/**
	 * Updates the knobs and highlight to match specified year range. If range
	 * is empty, updates the knob position to current year range.
	 * @param {String} start Starting year (decade).
	 * @param {String} end Ending year (decade).
	 */
	TrendChart.prototype.updateYearRange = function(start, end) {
		var knobA = this.knobA,
			knobB = this.knobB,
			xScale = this.xScale,
			bandwidth = xScale.bandwidth(),
			startStr = start || knobA.textContent,
			endStr = end || knobB.textContent ,
			xA = xScale(startStr) + bandwidth / 2,
			xB = xScale(endStr) + bandwidth * 1.5;
		knobA.style.transform = 'translate(' + xA + 'px,50%)';
		knobA.textContent = startStr;
		knobB.style.transform = 'translate(' + xB + 'px,50%)';
		knobB.textContent = endStr;
		this.highlight
			.attr('x', getKnobX(knobA))
			.attr('width', getKnobX(knobB) - getKnobX(knobA));
	};

	/**
	 * Updates the chart.
	 * @param {boolean} isInit If true, skip transitions.
	 */
	TrendChart.prototype.update = function(isInit) {

		var ele = this.ele,
			data = this.data,
			colors = this.colors,
			outerWidth = ele.clientWidth,
			outerHeight = ele.clientHeight,
			width  = outerWidth - MARGIN.left - MARGIN.right,
			height = outerHeight - MARGIN.top - MARGIN.bottom,
			xScale = this.xScale = d3.scaleBand()
				.range([ 0, width ])
				.domain(data.map(function(d) {
					return d.year;
				}))
				.padding(0.5),
			y0 = d3.scaleLinear()
				.range([ height, 0 ])
				.domain([ 0, this.y0Max ])
				.nice(),
			y1 = d3.scaleLinear()
				.range([ height, 0 ])
				.domain([ 0, this.y1Max ])
				.nice(),
			xAxis = d3.axisBottom().scale(xScale),
			y0Axis = d3.axisLeft().scale(y0),
			y1Axis = d3.axisRight().scale(y1),
			gXAxis = this.gXAxis,
			alt = false;

		// Resize canvas
		this.svg
			.attr('width', outerWidth)
			.attr('height', outerHeight);

		// x-axis
		gXAxis
			.call(xAxis.ticks())
			.attr('transform', 'translate(0,' + height + ')')
			.select('.label')
				.attr('transform', 'translate(' + (width / 2) + ',' + 44 + ')');

		// Alternate x-axis ticks
		gXAxis.selectAll('.tick text')
			.attr('y', function() {
				return (alt = !alt) ? 20 : 8;
			});
		gXAxis.selectAll('.tick line')
			.attr('y2', function() {
				return (alt = !alt) ? 16: 4;
			});

		// y-axis (observed)
		this.gY0Axis.call(y0Axis.ticks(10, 's'));

		// y-axis (found)
		this.gY1Axis.call(y1Axis.ticks(10, 's'))
			.attr('transform', 'translate(' + width + ',0)');

		// Bars
		var gBars = this.gBars.selectAll('g').data(data);
		gBars.exit().remove();
		gBars = gBars.enter()
			.append('g')
			.merge(gBars)
				.each(function(d) {
					var group = d3.select(this);
					group.selectAll('rect').remove();
					// Observed bar
					group.append('rect').datum(d)
						.attr('x', function(d) {
							return xScale(d.year);
						})
						.attr('y', function(d) {
							return y0(d.observed);
						})
						.attr('width', xScale.bandwidth() / 2)
						.attr('height', function(d) {
							return height - y0(d.observed);
						})
						.attr('fill', colors['observed']);
					// Found bar
					group.append('rect').datum(d)
						.attr('x', function(d) {
							return xScale(d.year) + xScale.bandwidth() /2 + xScale.padding();
						})
						.attr('y', function(d) {
							return y1(d.found);
						})
						.attr('width', xScale.bandwidth() / 2)
						.attr('height', function(d) {
							return height - y1(d.found);
						})
						.attr('fill', colors['found']);
				});

		// Update quantize scale for knob positioning
		this.qScale = d3.scaleQuantize()
			.domain([ 0, width ])
			.range(data.map(function(d) {
				return d.year;
			}));

		// Update knobs and highlight
		if (isInit) {
			this.updateYearRange(this.xMin, this.xMax);
		} else {
			this.updateYearRange();
		}
		this.highlight.attr('height', height);

	};

	window.TrendChart = TrendChart;

})();

