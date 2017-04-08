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
		BIN_MAX = 10000;

	/**
	 * Creates a new instance of MassChart.
	 * @param {HTMLElement} ele Container element to inject into.
	 * @param {Array} data Chart data.
	 */
	function MassChart(ele, data) {
		this.ele = ele;
		this.dataOriginal = data;
		this.data = null;
		this.bins = null;
		this.xScale = null;
		this.qScale = null;
		this.updateData();
		// Setup layout elements
		this.svg = d3.select(ele).append('svg');
		var gWrap = this.gWrap = this.svg.append('g');
		gWrap.attr('transform', 'translate(' + MARGIN.left + ',' + MARGIN.top + ')');
		this.wrapBound = gWrap.append('rect')
			.attr('class', 'bound');
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
			tip.style.opacity = 0;
			tipHighlight.classed('-active', false);
		});
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
		var extent = d3.extent(this.data, function(d) {
			return d.mass;
		});
		var scale = d3.scaleLog()
			.domain([ Math.max(BIN_MIN, extent[0]), Math.min(BIN_MAX, extent[1]) ]);
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

	function getTick(bin, withUnit) {
		var format = d3.format('.1s');
		return format(bin.x0) + (withUnit ? 'g' : '') + ' - ' + format(bin.x1) + (withUnit ? 'g' : '');
	}

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
			alt = false;

		// Resize canvas
		this.svg
			.attr('width', outerWidth)
			.attr('height', outerHeight);
		this.wrapBound
			.attr('width', width)
			.attr('height', height);

		// Resize highlight
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
				.attr('y', function(d) {
					return yScale(d.length);
				})
				.attr('width', xScale.bandwidth())
				.attr('height', function(d) {
					return height - yScale(d.length);
				});

		// Update quantize scale for knob positioning
		this.qScale = d3.scaleQuantize()
			.domain([ 0, width ])
			.range(bins);

	};

	window.MassChart = MassChart;

})();