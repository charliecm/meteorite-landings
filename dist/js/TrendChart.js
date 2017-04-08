/**
 *  Trend Chart
 *  Displays a stacked bar graph of meteorites count across years, grouped by
 *  discovery type.
 */

/* global d3 */

(function() {

	var MARGIN = {
		top: 6,
		left: 32,
		right: 32,
		bottom: 72
	};

	/**
	 * Creates a new instance of TrendChart.
	 * @param {HTMLElement} ele Container element to inject into.
	 * @param {Array} data Chart data.
	 * @param {Object} bins Name and colors mapped to series.
	 * @param {function} onYearChange Callback when year range has changed.
	 */
	function TrendChart(ele, data, bins, onYearChange) {
		this.ele = ele;
		this.onYearChange = onYearChange || function(){};
		this.xScale = null;
		this.qScale = null;
		// Parse data
		var counts = {};
		data.forEach(function(d) {
			var decade = (Math.floor(+d.year / 10) * 10) + 's';
			if (!counts.hasOwnProperty(decade)) {
				counts[decade] = {
					year: decade,
					found: 0,
					observed: 0
				};
			}
			counts[decade][d.discovery]++;
		});
		this.dataOriginal = data;
		this.data = Object.values(counts);
		var keys = Object.keys(counts);
		this.xMin = keys[0];
		this.xMax = keys[keys.length - 1];
		this.y0Max = d3.max(this.data, function(d) {
			return d.found;
		});
		this.y1Max = d3.max(this.data, function(d) {
			return d.observed;
		});
		// Setup layout elements
		this.svg = d3.select(ele).append('svg');
		var gWrap = this.gWrap = this.svg.append('g');
		gWrap.attr('transform', 'translate(' + MARGIN.left + ',' + MARGIN.top + ')');
		this.wrapBound = gWrap.append('rect')
			.attr('class', 'bound');
		var rangeHighlight = this.rangeHighlight = gWrap.append('rect')
			.attr('class', 'range-highlight');
		var tipHighlight = this.tipHighlight = gWrap.append('rect')
			.attr('class', 'tip-highlight');
		this.gXAxis = gWrap.append('g').attr('class', 'x-axis');
		this.gXAxis.append('text')
			.attr('class', 'label')
			.style('text-anchor', 'middle')
			.text('Decade');
		this.gY0Axis = gWrap.append('g').attr('class', 'y-axis');
		this.gY1Axis = gWrap.append('g').attr('class', 'y-axis');
		this.gBars = gWrap.append('g').attr('class', 'bars');
		// Tooltip
		var tip = document.createElement('div');
		tip.className = 'chart-tip';
		tip.style.opacity = 0;
		ele.append(tip);
		this.dragStart = 0;
		this.isDragging = false;
		gWrap.on('mousedown', function() {
			this.dragStart = d3.event.pageX;
			this.isDragging = true;
		}.bind(this));
		gWrap.on('mousemove', function() {
			// Show tooltip
			var event = d3.event,
				bound = ele.getBoundingClientRect(),
				xScale = this.xScale,
				bandwidth = xScale.bandwidth(),
				mouseX = event.pageX - bound.left,
				tipX = mouseX - tip.clientWidth / 2,
				tipY = event.pageY - bound.top - document.body.scrollTop - MARGIN.top - tip.clientHeight,
				d = this.qScale(mouseX - bandwidth / 2 - MARGIN.left),
				x = xScale(d.year);
			tip.style.opacity = 1;
			tip.style.transform = 'translate(' + tipX + 'px,' + tipY +'px)';
			var total = d.found + d.observed,
				percentage = d3.format('.2%')(total / this.dataOriginal.length);
			tip.innerHTML = '<strong>' + d.year + '</strong><br>' +
				d.found + ' found<br>' +
				d.observed + ' observed<br>' +
				total + ' total (' + percentage + ')';
			tipHighlight
				.classed('-active', true)
				.attr('x', x)
				.attr('width', bandwidth + xScale.padding());
		}.bind(this));
		gWrap.on('mouseout', function() {
			// Hide tooltip
			tip.style.opacity = 0;
			tipHighlight.classed('-active', false);
		});
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
		// Drag events
		document.addEventListener('mousemove', function(event) {
			this.dragChart(event);
			this.dragKnob(event);
		}.bind(this));
		document.addEventListener('mouseup', function(event) {
			this.releaseChart(event);
			this.releaseKnob(event);
		}.bind(this));
		// Add bin colors
		this.colors = [];
		for (var i in bins) {
			this.colors[bins[i].name] = bins[i].color;
		}
	}

	/**
	 * Handles dragging of chart area to change year range.
	 */
	TrendChart.prototype.dragChart = function(event) {
		if (!this.isDragging) return;
		var knobA = this.knobA,
			knobB = this.knobB,
			left = this.ele.getBoundingClientRect().left,
			xScale = this.xScale,
			bandwidth = xScale.bandwidth(),
			x1 = this.dragStart - left,
			x2 = event.pageX - left;
		if (x2 < x1) {
			var x3 = x1;
			x1 = x2;
			x2 = x3;
		}
		var d1 = this.qScale(x1 - bandwidth / 2 - MARGIN.left),
			d2 = this.qScale(x2 - bandwidth / 2 - MARGIN.left),
			xx1 = xScale(d1.year) + xScale.padding() + MARGIN.left,
			xx2 = xScale(d2.year) + bandwidth + xScale.padding() + MARGIN.left;
		knobA.style.transform = 'translate(' + (xx1 - knobA.clientWidth / 2) + 'px,50%)';
		knobA.textContent = d1.year;
		knobB.style.transform = 'translate(' + (xx2 - knobB.clientWidth / 2) + 'px,50%)';
		knobB.textContent = d2.year;
		this.rangeHighlight
			.attr('x', getKnobX(knobA))
			.attr('width', getKnobX(knobB) - getKnobX(knobA));
		event.preventDefault();
	};

	/**
	 * Updates the year range.
	 */
	TrendChart.prototype.releaseChart = function(event) {
		if (!this.isDragging) return;
		var left = this.ele.getBoundingClientRect().left,
			bandwidth = this.xScale.bandwidth(),
			x1 = this.dragStart - left,
			x2 = event.pageX - left;
		if (x2 < x1) {
			var x3 = x1;
			x1 = x2;
			x2 = x3;
		}
		var d1 = this.qScale(x1 - bandwidth / 2 - MARGIN.left),
			d2 = this.qScale(x2 - bandwidth / 2 - MARGIN.left);
		this.updateYearRange(d1.year, d2.year);
		this.isDragging = false;
	};

	/**
	 * Handles dragging of knob to change year range.
	 */
	TrendChart.prototype.dragKnob = function(event) {
		var knob = this.knobActive;
		if (!knob) return;
		var bound = this.ele.getBoundingClientRect(),
			offsetX = knob.clientWidth / 2,
			bandwidth = this.xScale.bandwidth(),
			knobA = this.knobA,
			knobB = this.knobB,
			xMin = (knob === knobB) ? getKnobX(knobA) + bound.left + bandwidth * 1.25 : bound.left - offsetX + MARGIN.left,
			xMax = (knob === knobA) ? getKnobX(knobB) + bound.left - bandwidth / 2 : bound.right - offsetX - MARGIN.right,
			x = Math.min(Math.max(event.pageX - offsetX, xMin), xMax) - bound.left,
			d = this.qScale(x - bandwidth / 2);
		knob.style.transform = 'translate(' + x + 'px,50%)';
		knob.textContent = d.year;
		this.rangeHighlight
			.attr('x', getKnobX(knobA))
			.attr('width', getKnobX(knobB) - getKnobX(knobA));
		event.preventDefault();
	};

	/**
	 * Updates the year range based knob position.
	 */
	TrendChart.prototype.releaseKnob = function(event) {
		var knob = this.knobActive;
		if (!knob) return;
		var knobA = this.knobA,
			knobB = this.knobB,
			bound = this.ele.getBoundingClientRect(),
			offsetX = knob.clientWidth / 2,
			xScale = this.xScale,
			bandwidth = xScale.bandwidth(),
			xMin = (knob === knobB) ? getKnobX(knobA) + bound.left + bandwidth * 1.25 : bound.left - offsetX + MARGIN.left,
			xMax = (knob === knobA) ? getKnobX(knobB) + bound.left - bandwidth / 2 : bound.right - offsetX - MARGIN.right,
			x = Math.min(Math.max(event.pageX - offsetX, xMin), xMax) - bound.left,
			d = this.qScale(x - bandwidth / 2),
			endX = xScale(d.year) + bandwidth + xScale.padding();
		if (knob === knobB) {
			endX += bandwidth;
		}
		knob.style.transform = 'translate(' + endX + 'px,50%)';
		knob.textContent = d.year;
		this.rangeHighlight
			.attr('x', getKnobX(knobA))
			.attr('width', getKnobX(knobB) - getKnobX(knobA));
		this.knobActive = null;
		this.onYearChange(parseInt(knobA.textContent, 10), parseInt(knobB.textContent, 10));
	};

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
			xA = xScale(startStr) + bandwidth,
			xB = xScale(endStr) + bandwidth * 2 + xScale.padding();
		knobA.style.transform = 'translate(' + xA + 'px,50%)';
		knobA.textContent = startStr;
		knobB.style.transform = 'translate(' + xB + 'px,50%)';
		knobB.textContent = endStr;
		this.rangeHighlight
			.attr('x', getKnobX(knobA))
			.attr('width', getKnobX(knobB) - getKnobX(knobA));
		this.onYearChange(parseInt(knobA.textContent, 10), parseInt(knobB.textContent, 10));
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
		this.wrapBound
			.attr('width', width)
			.attr('height', height);

		// Resize highlight areas
		this.rangeHighlight.attr('height', height);
		this.tipHighlight.attr('height', height);

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
		alt = false;
		gXAxis.selectAll('.tick line')
			.attr('y2', function() {
				return (alt = !alt) ? 16: 4;
			});

		// y-axis (found)
		this.gY0Axis.call(y0Axis.ticks(10, 's'));

		// y-axis (observed)
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
					// Found bar
					group.append('rect').datum(d)
						.attr('x', function(d) {
							return xScale(d.year);
						})
						.attr('y', function(d) {
							return y0(d.found);
						})
						.attr('width', xScale.bandwidth() / 2)
						.attr('height', function(d) {
							return height - y0(d.found);
						})
						.attr('fill', colors['found']);
					// Observed bar
					group.append('rect').datum(d)
						.attr('x', function(d) {
							return xScale(d.year) + xScale.bandwidth() /2 + xScale.padding();
						})
						.attr('y', function(d) {
							return y1(d.observed);
						})
						.attr('width', xScale.bandwidth() / 2)
						.attr('height', function(d) {
							return height - y1(d.observed);
						})
						.attr('fill', colors['observed']);
				});

		// Update quantize scale for knob positioning
		this.qScale = d3.scaleQuantize()
			.domain([ 0, width ])
			.range(data);

		// Update year range knobs
		if (isInit) {
			this.updateYearRange(this.xMin, this.xMax);
		} else {
			this.updateYearRange();
		}

	};

	window.TrendChart = TrendChart;

})();

