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
		right: 8,
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
		var keys = Object.keys(counts);
		this.xMin = keys[0];
		this.xMax = keys[keys.length - 1];
		this.data = Object.values(counts);
		this.updateData();
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
		this.gYAxis = this.gWrap.append('g').attr('class', 'y-axis');
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
				xMin = bound.left - offsetX + MARGIN.left,
				xMax = bound.right - offsetX - MARGIN.right,
				x = Math.min(Math.max(event.pageX - offsetX, xMin), xMax) - bound.left,
				year = this.qScale(x - this.xScale.bandwidth() / 2);
			knob.style.transform = 'translate(' + x + 'px,50%)';
			knob.textContent = year;
			highlight
				.attr('x', getKnobX(knobA))
				.attr('width', getKnobX(knobB) - getKnobX(knobA));
		}.bind(this));
		// Drag release - snap to nearest year band
		document.addEventListener('mouseup', function() {
			var knob = this.knobActive;
			if (!knob) return;
			var bound = ele.getBoundingClientRect(),
				offsetX = knob.clientWidth / 2,
				xMin = bound.left - offsetX + MARGIN.left,
				xMax = bound.right - offsetX - MARGIN.right,
				x = Math.min(Math.max(event.pageX - offsetX, xMin), xMax) - bound.left,
				xScale = this.xScale,
				bandwidth = xScale.bandwidth(),
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
	 * Returns the start of year range.
	 * @return {number} Starting year.
	 */
	TrendChart.prototype.getYearStart = function() {
		return this.knobA.textContent.substring(0, -1);
	};

	/**
	 * Returns the end of year range.
	 * @return {number} Ending year
	 */
	TrendChart.prototype.getYearEnd = function() {
		return this.knobB.textContent.substring(0, -1);
	};

	/**
	 * Updates and filters the data.
	 * @param {String} discovery Name of discovery type to filter.
	 */
	TrendChart.prototype.updateData = function(discovery) {
		var data = this.data,
			showObserved = (!discovery || discovery === 'observed'),
			showFound = (!discovery || discovery === 'found'),
			keys = [];
		if (showObserved) keys.push('observed');
		if (showFound) keys.push('found');
		this.series = d3.stack().keys(keys)(data);
		this.yMax = d3.max(data, function(d) {
			return (showObserved ? d.observed : 0) +
				(showFound ? d.found : 0);
		});
	};

	/**
	 * Updates the chart.
	 * @param {boolean} isInit If true, skip transitions.
	 */
	TrendChart.prototype.update = function(isInit) {

		var ele = this.ele,
			data = this.data,
			series = this.series,
			yMax = this.yMax,
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
			yScale = d3.scaleLinear()
				.range([ height, 0 ])
				.domain([ 0, yMax ])
				.nice(),
			xAxis = d3.axisBottom().scale(xScale),
			yAxis = d3.axisLeft().scale(yScale),
			gXAxis = this.gXAxis,
			alt = false;

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

		// Resize canvas
		this.svg
			.attr('width', outerWidth)
			.attr('height', outerHeight);

		this.highlight
			.attr('height', height);

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

		// y-axis
		this.gYAxis.call(yAxis.ticks(10, 's'));

		// Series groups
		var gSeries = this.gBars.selectAll('.series').data(series);
		gSeries.exit().remove();
		gSeries = gSeries.enter()
			.append('g')
				.attr('class', 'series')
			.merge(gSeries)
				.attr('fill', function(d) {
					return colors[d.key];
				});

		// Series bars
		var gSeriesBars = gSeries.selectAll('g')
			.data(function(d) {
				return d;
			});
		gSeriesBars.exit().remove();
		gSeriesBars = gSeriesBars.enter()
			.append('g')
			.merge(gSeriesBars)
			.each(function(d) {
				// Create bars
				d3.select(this).select('rect').remove();
				d3.select(this).append('rect').datum(d)
					.attr('x', function(d) {
						return xScale(d.data.year);
					})
					.attr('y', function(d) {
						return yScale(d[1]);
					})
					.attr('width', xScale.bandwidth())
					.attr('height', function(d) {
						return yScale(d[0]) - yScale(d[1]);
					});
			});

	};

	window.TrendChart = TrendChart;

})();

