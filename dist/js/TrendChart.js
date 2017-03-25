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
		},
		seriesKeys = [
			'observed',
			'found'
		];

	function TrendChart(ele, data, bins) {
		this.ele = ele;
		// Parse data
		this.originalData = data;
		this.data = {};
		this.bins = bins;
		this.parseData();
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

	TrendChart.prototype.parseData = function() {
		var data = this.data,
			bins = this.bins;
		this.originalData.forEach(function(d) {
			if (!data.hasOwnProperty(d.year)) {
				data[d.year] = {
					year: d.year,
					found: 0,
					observed: 0
				};
			}
			if ((d.discovery === 'observed' && bins[0].isEnabled) ||
				(d.discovery === 'found' && bins[1].isEnabled)) {
				data[d.year][d.discovery]++;
			}
		});
		data = this.data = Object.values(data);
		this.series = d3.stack().keys(seriesKeys)(data);
		this.yMax = d3.max(data, function(d) {
			return d.observed + d.found;
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
		// 	.append('text')
		// 	.attrs({
		// 		transform: 'rotate(-90)',
		// 		x: -height / 2,
		// 		y: 0,
		// 		dx: '1em'
		// 	})
		// 	.text('Count');
		// 	.call(xAxis.ticks(d3.timeYear.every(100)))
		// 	.attr('transform', 'translate(0,' + height + ')');

		// y-axis
		this.gYAxis.call(yAxis.ticks(10, 's'));

		var colors = this.colors;

		var gSeries = this.gSeries = this.gBars.selectAll('series').data(series);
		gSeries.exit().remove();
		gSeries = gSeries.enter()
			.append('g')
			.attr('class', 'series')
			.attr('fill', function(d) {
				return colors[d.key];
			})
			.merge(gSeries);

		var gSeriesBars = gSeries.selectAll('g')
			.data(function(d) {
				return d;
			});
		gSeriesBars.exit().remove();
		gSeriesBars.enter()
			.append('g')
			.each(function(d) {
				d3.select(this).append('rect').datum(d);
			});
		gSeriesBars = gSeries.selectAll('g');
		gSeriesBars.selectAll('rect')
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

	};

	window.TrendChart = TrendChart;

})();

