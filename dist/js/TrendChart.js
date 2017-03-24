/**
 *  Trend Chart
 *  Displays a stacked bar graph of meteorites count across years, grouped by
 *  discovery type.
 */

/* global d3 */

(function() {

	var margin = {
		top: 24,
		left: 96,
		right: 0,
		bottom: 56
	};

	function TrendChart(ele, data, bins) {
		this.ele = ele;
		// Setup layout elements
		this.svg = d3.select(ele).append('svg');
		this.gWrap = this.svg.append('g');
		this.gXAxis = this.gWrap.append('g'),
		this.gYAxis = this.gWrap.append('g'),
		this.gBars = this.gWrap.append('g');
		this.gWrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
		this.yMax = d3.max(d3.nest()
			.key(function(d) { return d.year; })
			.rollup(function(l) { return l.length; }).entries(data),
			function(d) { return d.value; });
		this.data = d3.nest()
			.key(function(d) {return d.discovery; })
			.key(function(d) { return d.year; })
			.rollup(function(l) { return l.length; })
			.entries(data);
		console.log(this.yMax, this.data);
		// Add bin colors
		this.colors = [];
		for (var i in bins) {
			this.colors.push(bins[i].color);
		}
	}

	/**
	 * Updates the chart.
	 * @param {boolean} isInit If true, skip transitions.
	 */
	TrendChart.prototype.update = function(isInit) {
		var ele = this.ele,
			data = this.data,
			yMax = this.yMax,
			outerWidth = ele.clientWidth,
			outerHeight = ele.clientHeight,
			width  = outerWidth - margin.left - margin.right,
			height = outerHeight - margin.top - margin.bottom,
			xScale = d3.scaleBand()
				.rangeRound([ 0, width ])
				.padding(0.05)
				.domain(data.map(function(d) {
					return d.year;
				})),
			yScale = d3.scaleLinear()
				.range([ height, 0 ])
				.domain([ 0, yMax ]),
			xAxis = d3.axisBottom().scale(xScale),
			yAxis = d3.axisLeft().scale(yScale);

		// Resize canvas
		this.svg.attrs({
			class: 'chart',
			width: outerWidth,
			height: outerHeight
		});

		// x-axis
		this.gXAxis
			.call(xAxis.ticks(100))
			.attr('transform', 'translate(0,' + height + ')');

		// y-axis
		this.gYAxis.call(yAxis.ticks(10, '.2s'));

		// gBars.selectAll('rect')
		// 	.data(massData)
		// 	.enter()
		// 		.append('rect')
		// 		.attrs({
		// 			width: xScale.bandwidth(),
		// 			height: function(d) {
		// 				return yScale(d);
		// 			},
		// 			x: function(d) {
		// 				return xScale(d.year);
		// 			},
		// 			y: function(d) {
		// 				return height - yScale(d);
		// 			}
		// 		});

	};

	window.TrendChart = TrendChart;

})();

