/**
 * Mass Chart
 * Displays a histogram of meteorites by mass.
 */

/* global d3 */

(function() {

	var MARGIN = {
			top: 6,
			left: 32,
			right: 12,
			bottom: 72
		},
		BIN_MIN = 1,
		BIN_MAX = 10000,
		TRANSITION_DURATION = 600;

	/**
	 * Creates a new instance of MassChart.
	 * @param {HTMLElement} ele Container element to inject into.
	 * @param {Array} data Chart data.
	 * @param {function} onMassChange Callback when mass range has changed.
	 */
	function MassChart(ele, data, onMassChange) {
		this.ele = ele;
		this.onMassChange = onMassChange || function(){};
		this.dataOriginal = data;
		this.data = null;
		this.bins = null;
		this.xScale = null;
		this.qScale = null;
		var extent = this.extent = d3.extent(data, function(d) {
			return d.mass;
		});
		this.xMin = extent[0];
		this.xMax = extent[1];
		this.updateData();
		// Setup layout elements
		this.svg = d3.select(ele).append('svg');
		var gWrap = this.gWrap = this.svg.append('g');
		gWrap.attr('transform', 'translate(' + MARGIN.left + ',' + MARGIN.top + ')');
		this.wrapBound = gWrap.append('rect')
			.attr('class', 'bound');
		this.rangeHighlight = gWrap.append('rect')
			.attr('class', 'range-highlight');
		var tipHighlight = this.tipHighlight = gWrap.append('rect')
			.attr('class', 'tip-highlight');
		this.gXAxis = gWrap.append('g').attr('class', 'x-axis');
		this.gXAxis.append('text')
			.attr('class', 'label')
			.style('text-anchor', 'middle')
			.text('Mass (g)');
		this.gYAxis = gWrap.append('g').attr('class', 'y-axis');
		this.gBars = gWrap.append('g').attr('class', 'bars');
		// Tooltip
		var tip = document.createElement('div');
		tip.className = 'chart-tip';
		tip.style.opacity = 0;
		ele.append(tip);
		gWrap.on('mousemove', function() {
			// Show tooltip
			var event = d3.event,
				bound = ele.getBoundingClientRect(),
				xScale = this.xScale,
				bandwidth = xScale.bandwidth(),
				mouseX = event.pageX - bound.left,
				tipX = mouseX - tip.clientWidth / 2,
				tipY = event.pageY - bound.top - document.body.scrollTop - MARGIN.top - tip.clientHeight,
				bin = this.qScale(mouseX - bandwidth / 2 - MARGIN.left),
				x = xScale(getTick(bin));
			tip.style.opacity = 1;
			tip.style.transform = 'translate(' + tipX + 'px,' + tipY +'px)';
			var percentage = d3.format('.2%')(bin.length / this.data.length);
			tip.innerHTML = '<strong>' + getTick(bin, true) + '</strong><br>' +
				bin.length + ' meteorites (' + percentage + ')';
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
		this.rangeStart = null;
		this.rangeEnd = null;
		this.knobActive = null;
		this.dragStart = 0;
		this.isDragging = false;
		// Knobs
		var knobA = this.knobA = document.createElement('div');
		var knobB = this.knobB = document.createElement('div');
		knobA.className = knobB.className = 'trend-knob';
		ele.append(knobA);
		ele.append(knobB);
		knobA.addEventListener('mousedown', function() {
			this.knobActive = knobA;
		}.bind(this));
		knobB.addEventListener('mousedown', function() {
			this.knobActive = knobB;
		}.bind(this));
		// Chart drag
		gWrap.on('mousedown', function() {
			this.dragStart = d3.event.pageX;
			this.isDragging = true;
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
	}

	/**
	 * Returns bin tick value.
	 * @param {Array} bin Bin data.
	 * @param {boolean} withUnit Display unit (g).
	 * @return {String} Bin tick value.
	 */
	function getTick(bin, withUnit) {
		var format = d3.format('.1s');
		if (bin.x0 === 0) {
			return 'Unknown';
		}
		return format(bin.x0) + (withUnit ? 'g' : '') + ' - ' + format(bin.x1) + (withUnit ? 'g' : '');
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
	 * Updates and filters the data.
	 * @param {number} yearStart Start year.
	 * @param {number} yearEnd End year.
	 */
	MassChart.prototype.updateData = function(yearStart, yearEnd) {
		if (yearStart === yearEnd) {
			yearEnd += 10;
		}
		this.data = this.dataOriginal.filter(function(d) {
			var include = true;
			if (yearStart !== undefined &&
				(d.year < yearStart ||
				d.year > yearEnd)) {
				include = false;
			}
			return include;
		});
		var extent = this.extent;
		var scale = d3.scaleLog()
			.domain([ Math.max(BIN_MIN, extent[0]), Math.min(BIN_MAX, extent[1]) ]);
		// Add zero and lower threshold bins for histogram
		var thresholds = scale.ticks();
		thresholds.shift();
		thresholds.unshift(0.01);
		thresholds.unshift(0);
		// Create histogram bins
		var histogram = d3.histogram()
			.value(function(d) {
				return d.mass;
			})
			.domain(extent)
			.thresholds(thresholds);
		this.bins = histogram(this.data);
		return extent;
	};

	/**
	 * Returns the bin the specified value belongs to.
	 * @param {number} val Mass value.
	 * @return {number} Mass bin.
	 */
	MassChart.prototype.getBin = function(val, isStart) {
		var bins = this.bins,
			count = bins.length,
			i = 0;
		if (isStart) {
			i = count - 1;
			for (; i >= 0; i--) {
				if (val >= bins[i].x0) {
					return bins[i];
				}
			}
		}
		for (; i < count; i++) {
			if (val <= bins[i].x1) {
				return bins[i];
			}
		}
	};

	/**
	 * Handles dragging of chart area to change mass range.
	 */
	MassChart.prototype.dragChart = function(event) {
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
		var b1 = this.qScale(x1 - MARGIN.left),
			b2 = this.qScale(x2 - MARGIN.left),
			t1 = getTick(b1),
			t2 = getTick(b2),
			xA = xScale(t1) + MARGIN.left - knobA.clientWidth / 2,
			xB = xScale(t2) + MARGIN.left - knobB.clientWidth / 2 + bandwidth;
		knobA.style.transform = 'translate(' + xA + 'px,50%)';
		knobA.textContent = t1;
		knobB.style.transform = 'translate(' + xB + 'px,50%)';
		knobB.textContent = t2;
		this.rangeHighlight
			.attr('x', getKnobX(knobA))
			.attr('width', getKnobX(knobB) - getKnobX(knobA));
		event.preventDefault();
	};

	/**
	 * Updates the mass range.
	 */
	MassChart.prototype.releaseChart = function(event) {
		if (!this.isDragging) return;
		this.isDragging = false;
		var left = this.ele.getBoundingClientRect().left,
			x1 = this.dragStart - left,
			x2 = event.pageX - left;
		if (x2 < x1) {
			var x3 = x1;
			x1 = x2;
			x2 = x3;
		}
		var b1 = this.qScale(x1 - MARGIN.left),
			b2 = this.qScale(x2 - MARGIN.left);
		this.updateMassRange(b1.x0, b2.x1);
		var range = this.getMassRange();
		this.onMassChange(range[0], range[1]);
	};

	/**
	 * Handles dragging of knob to change mass range.
	 */
	MassChart.prototype.dragKnob = function(event) {
		var knob = this.knobActive;
		if (!knob) return;
		var bound = this.ele.getBoundingClientRect(),
			offsetX = knob.clientWidth / 2,
			bandwidth = this.xScale.bandwidth(),
			knobA = this.knobA,
			knobB = this.knobB,
			xMin = (knob === knobB) ? getKnobX(knobA) + bound.left : bound.left - offsetX + MARGIN.left,
			xMax = (knob === knobA) ? getKnobX(knobB) + bound.left : bound.right - offsetX - MARGIN.right,
			x = Math.min(Math.max(event.pageX - offsetX, xMin), xMax) - bound.left,
			b = this.qScale(x - bandwidth / 2);
		// Update knob position
		knob.textContent = getTick(b);
		x += offsetX - knob.clientWidth / 2;
		knob.style.transform = 'translate(' + x + 'px,50%)';
		// Update highlight area
		this.rangeHighlight
			.attr('x', getKnobX(knobA))
			.attr('width', getKnobX(knobB) - getKnobX(knobA));
		event.preventDefault();
	};

	/**
	 * Updates the mass range based knob position.
	 */
	MassChart.prototype.releaseKnob = function(event) {
		var knob = this.knobActive;
		if (!knob) return;
		var knobA = this.knobA,
			knobB = this.knobB,
			bound = this.ele.getBoundingClientRect(),
			offsetX = knob.clientWidth / 2,
			xScale = this.xScale,
			bandwidth = xScale.bandwidth(),
			xMin = (knob === knobB) ? getKnobX(knobA) + bound.left : bound.left - offsetX + MARGIN.left,
			xMax = (knob === knobA) ? getKnobX(knobB) + bound.left : bound.right - offsetX - MARGIN.right,
			x = Math.min(Math.max(event.pageX - offsetX, xMin), xMax) - bound.left,
			b = this.qScale(x - bandwidth / 2),
			t = getTick(b),
			xK = xScale(t) + MARGIN.left;
		if (knob === knobA) {
			this.rangeStart = b;
		} else {
			this.rangeEnd = b;
			xK += bandwidth;
		}
		// Update knob position
		knob.textContent = t;
		xK -= knob.clientWidth / 2;
		knob.style.transform = 'translate(' + xK + 'px,50%)';
		// Update highlight area
		this.rangeHighlight
			.attr('x', getKnobX(knobA))
			.attr('width', getKnobX(knobB) - getKnobX(knobA));
		this.knobActive = null;
		var range = this.getMassRange();
		this.onMassChange(range[0], range[1]);
	};

	/**
	 * Updates the knobs and highlight to match specified mass range. If range
	 * is empty, updates the knob position to current mass range.
	 * @param {number} start Min mass.
	 * @param {number} end Max mass.
	 */
	MassChart.prototype.updateMassRange = function(start, end) {
		var knobA = this.knobA,
			knobB = this.knobB,
			xScale = this.xScale,
			bandwidth = xScale.bandwidth(),
			startVal = start !== undefined ? start : Math.max(this.rangeStart.x0, this.xMin),
			endVal = end !== undefined ? end : Math.min(this.rangeEnd.x1, this.xMax),
			startBin = this.rangeStart = this.getBin(startVal, true),
			endBin = this.rangeEnd = this.getBin(endVal),
			startTick = getTick(startBin),
			endTick = getTick(endBin),
			xA = xScale(startTick) + MARGIN.left,
			xB = xScale(endTick) + MARGIN.left + bandwidth;
		knobA.textContent = startTick;
		xA -= knobA.clientWidth / 2;
		knobA.style.transform = 'translate(' + xA + 'px,50%)';
		knobB.textContent = endTick;
		xB -= knobB.clientWidth / 2;
		knobB.style.transform = 'translate(' + xB + 'px,50%)';
		this.rangeHighlight
			.attr('x', getKnobX(knobA))
			.attr('width', getKnobX(knobB) - getKnobX(knobA));
	};

	/**
	 * Updates the chart.
	 * @param {boolean} isInit If true, skip transitions.
	 */
	MassChart.prototype.update = function(isInit) {

		var ele = this.ele,
			bins = this.bins,
			outerWidth = ele.clientWidth,
			outerHeight = ele.clientHeight,
			width  = outerWidth - MARGIN.left - MARGIN.right,
			height = outerHeight - MARGIN.top - MARGIN.bottom,
			xScale = this.xScale = d3.scaleBand()
				.domain(bins.map(function(d) {
					return getTick(d);
				}))
				.range([ 0, width ])
				.padding(0.5),
			yScale = d3.scaleLinear()
				.range([ height, 0 ])
				.domain([ 0, d3.max(bins, function(d) {
					return d.length;
				}) ])
				.nice(),
			xAxis = d3.axisBottom().scale(xScale),
			yAxis = d3.axisLeft().scale(yScale),
			gXAxis = this.gXAxis,
			alt = false,
			duration = (isInit) ? 0 : TRANSITION_DURATION;

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

		// y-axis
		this.gYAxis.call(yAxis.ticks(10, 's'));

		// Bars
		var gBars = this.gBars.selectAll('rect').data(bins);
		gBars.exit().remove();
		gBars = gBars.enter()
			.append('rect')
				.attr('class', 'bar')
			.merge(gBars)
				.attr('x', function(d) {
					return xScale(getTick(d));
				})
				.attr('width', xScale.bandwidth())
				.transition().duration(duration)
					.attr('y', function(d) {
						return yScale(d.length);
					})
					.attr('height', function(d) {
						return height - yScale(d.length);
					});

		// Update quantize scale for knob positioning
		this.qScale = d3.scaleQuantize()
			.domain([ 0, width ])
			.range(bins);

		// Update mass range knobs
		if (isInit) {
			this.updateMassRange(this.xMin, this.xMax);
		} else {
			this.updateMassRange();
		}

	};

	/**
	 * Returns the current mass range.
	 * @return {Array} Min and max mass.
	 */
	MassChart.prototype.getMassRange = function() {
		return [ this.rangeStart.x0, this.rangeEnd.x1 ];
	};

	window.MassChart = MassChart;

})();