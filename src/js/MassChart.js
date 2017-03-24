/**
 * Mass Chart
 * Displays a histogram of meteorites by mass.
 */

(function() {

	function MassChart(ele, data) {
		this.ele = ele;
		this.data = data;
	}

	/**
	 * Updates the chart.
	 * @param {boolean} isInit If true, skip transitions.
	 */
	MassChart.prototype.update = function(isInit) {
		var ele = this.ele,
			data = this.data;
	};

	window.MassChart = MassChart;

})();