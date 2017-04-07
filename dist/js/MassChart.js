/**
 * Mass Chart
 * Displays a histogram of meteorites by mass.
 */

/* global d3 */

(function() {

	var MARGIN = {
			top: 6,
			left: 32,
			right: 0,
			bottom: 64
		},
		BIN_MIN = 100,
		BIN_MAX = 10000;

	/**
	 * Creates a new instance of MassChart.
	 * @param {HTMLElement} ele Container element to inject into.
	 * @param {Array} data Chart data.
	 */
	function MassChart(ele, data) {
		this.ele = ele;
		this.originalData = data;
		this.data = null;
		this.bins = null;
		this.updateData();
		// Setup layout elements
		this.svg = d3.select(ele).append('svg');
		this.gWrap = this.svg.append('g');
		this.gWrap.attr('transform', 'translate(' + MARGIN.left + ',' + MARGIN.top + ')');
		this.gXAxis = this.gWrap.append('g').attr('class', 'x-axis');
		this.gXAxis.append('text')
			.attr('class', 'label')
			.style('text-anchor', 'middle')
			.text('Mass (g)');
		this.gYAxis = this.gWrap.append('g').attr('class', 'y-axis');
		this.gBars = this.gWrap.append('g').attr('class', 'bars');
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
		this.data = this.originalData.filter(function(d) {
			var include = true;
			if (yearStart !== undefined &&
				(d.year < yearStart ||
				d.year > yearEnd)) {
				include = false;
			}
			return include;
		});
		var max = d3.max(this.data, function(d) {
			return d.mass;
		});
		var scale = d3.scaleLog()
			.domain([ BIN_MIN, Math.min(BIN_MAX, max) ]);
		var histogram = d3.histogram()
			.value(function(d) {
				return d.mass;
			})
			.domain(d3.extent(this.data, function(d) {
				return d.mass;
			}))
			.thresholds(scale.ticks());
		this.bins = histogram(this.data);
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
			getTick = function(bin) {
				var format = d3.format('.1s');
				return format(bin.x0) + ' - ' + format(bin.x1);
			},
			xScale = d3.scaleBand()
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

		// y-axis
		this.gYAxis.call(yAxis.ticks(10, 's'));

		// Bars
		var gBars = this.gBars.selectAll('rect').data(bins);
		gBars.exit().remove();
		gBars = gBars.enter()
			.append('rect')
			.merge(gBars)
				.attr('x', function(d) {
					return xScale(getTick(d));
				})
				.attr('y', function(d) {
					return yScale(d.length);
				})
				.attr('width', xScale.bandwidth())
				.attr('height', function(d) {
					return height - yScale(d.length);
				});

	};

	window.MassChart = MassChart;

})();