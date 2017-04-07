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
		this.data = Object.values(counts);
		this.updateData();
		// Setup layout elements
		this.svg = d3.select(ele).append('svg');
		this.gWrap = this.svg.append('g');
		this.gWrap.attr('transform', 'translate(' + MARGIN.left + ',' + MARGIN.top + ')');
		this.highlight = this.gWrap.append('rect')
			.attr('class', 'highlight');
		this.gXAxis = this.gWrap.append('g').attr('class', 'x-axis');
		this.gXAxis.append('text')
			.attr('class', 'label')
			.style('text-anchor', 'middle')
			.text('Year (by decades)');
		this.gYAxis = this.gWrap.append('g').attr('class', 'y-axis');
		this.gBars = this.gWrap.append('g').attr('class', 'bars');
		createSlider.call(this, ele, this.highlight);
		// Add bin colors
		this.colors = [];
		for (var i in bins) {
			this.colors[bins[i].name] = bins[i].color;
		}
	}

	function createSlider(ele, highlight) {
		var knobA = document.createElement('div');
		knobA.className = 'trend-knob';
		knobA.textContent = '1930';
		ele.append(knobA);
		var knobB = document.createElement('div');
		knobB.className = 'trend-knob';
		knobB.textContent = '1930';
		ele.append(knobB);
		var dragEle = null;
		knobA.addEventListener('mousedown', function() {
			dragEle = this;
		});
		knobB.addEventListener('mousedown', function() {
			dragEle = this;
		});
		document.addEventListener('mousemove', function(event) {
			if (!dragEle) return;
			var bound = ele.getBoundingClientRect(),
				offsetX = dragEle.clientWidth / 2,
				xMin = bound.left - offsetX + MARGIN.left,
				xMax = bound.right - offsetX - MARGIN.right,
				x = Math.min(Math.max(event.pageX - offsetX, xMin), xMax),
				year = this.qScale(x - bound.left);
			// console.log(x, bound.left, MARGIN.left);
			dragEle.style.transform = 'translate(' + x + 'px,0)';
			dragEle.textContent = year;
			highlight
				.attr('x', getKnobX(knobA))
				.attr('width', getKnobX(knobB) - getKnobX(knobA));
		}.bind(this));
		document.addEventListener('mouseup', function() {
			if (!dragEle) return;
			var bound = ele.getBoundingClientRect(),
				x = getKnobX(dragEle) - bound.left + MARGIN.left,
				year = this.qScale(x),
				endX = this.xScale(year) + bound.left + this.xScale.bandwidth();
			// console.log('b', x);
			if (dragEle === knobB) {
				endX += this.xScale.bandwidth();
			}
			dragEle.style.transform = 'translate(' + endX + 'px,0)';
			dragEle.textContent = year;
			highlight
				.attr('x', getKnobX(knobA))
				.attr('width', getKnobX(knobB) - getKnobX(knobA));
			dragEle = null;
		}.bind(this));
	}

	function getKnobX(ele) {
		return ele.getBoundingClientRect().left - MARGIN.left - MARGIN.right;
	}

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


		this.qScale = d3.scaleQuantize()
			.domain([ 0, width ])
			.range(data.map(function(d) {
				return d.year;
			}));

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

