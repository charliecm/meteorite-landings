/**
 *  Trend Chart
 *  Displays a stacked bar graph of meteorites count across years, grouped by
 *  discovery type.
 */

/* global d3 */

(function() {

	var margin = {
		top: 24,
		left: 32,
		right: 0,
		bottom: 56
	};

	/**
	 * Creates a new instance of TrendChart.
	 * @param {HTMLElement} ele Container element to inject into.
	 * @param {Array} data Chart data.
	 * @param {Object} bins Name and colors mapped to series.
	 */
	function TrendChart(ele, data, bins) {
		var counts = {};
		this.ele = ele;
		// Parse data
		data.forEach(function(d) {
			if (!counts.hasOwnProperty(d.year)) {
				counts[d.year] = {
					year: d.year,
					observed: 0,
					found: 0
				};
			}
			counts[d.year][d.discovery]++;
		});
		this.data = Object.values(counts);
		this.updateData();
		// Setup layout elements
		this.svg = d3.select(ele).append('svg');
		this.gWrap = this.svg.append('g');
		this.gWrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
		this.gXAxis = this.gWrap.append('g').attr('class', 'x-axis');
		this.gXAxis.append('line');
		this.gYAxis = this.gWrap.append('g').attr('class', 'y-axis');
		this.gBars = this.gWrap.append('g').attr('class', 'bars');
		// Add bin colors
		this.colors = [];
		for (var i in bins) {
			this.colors[bins[i].name] = bins[i].color;
		}
	}

	/**
	 * Updates and filters the data.
	 * @param {String} activeSeries Name of series to filter.
	 */
	TrendChart.prototype.updateData = function(activeSeries) {
		var data = this.data,
			showObserved = (!activeSeries || activeSeries === 'observed'),
			showFound = (!activeSeries || activeSeries === 'found'),
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
			width  = outerWidth - margin.left - margin.right,
			height = outerHeight - margin.top - margin.bottom,
			xScale = d3.scaleBand()
				.range([ 0, width ])
				.domain(data.map(function(d) {
					return d.year;
				}))
				.padding(0.5),
			yScale = d3.scaleLinear()
				.range([ height, 0 ])
				.domain([ 0, yMax ])
				.nice(),
			// xAxis = d3.axisBottom().scale(xScale),
			yAxis = d3.axisLeft().scale(yScale);

		// Resize canvas
		this.svg.attrs({
			width: outerWidth,
			height: outerHeight
		});

		// x-axis
		// this.gXAxis
		// 	.call(xAxis.ticks(d3.timeYear.every(100)))
		// 	.attr('transform', 'translate(0,' + height + ')');

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
					.attrs({
						x: function(d) {
							return xScale(d.data.year);
						},
						width: xScale.bandwidth(),
						height: function(d) {
							return yScale(d[0]) - yScale(d[1]);
						}
					})
					.attr('y', function(d) {
						return yScale(d[1]);
					});
			});

	};

	window.TrendChart = TrendChart;

})();

