import { extent } from '../model/extent';
import { multiExtent } from '../model/multi-extent';

function matrix() {

	// Chart dimensions
	var _cellSize = 16;
	var _cellMargin = 1;
	var _margin = { top: 20, right: 2, bottom: 2, left: 64 };

	// Transition duration
	var _duration = 500;

	// d3 dispatcher for handling events
	var _dispatch = d3.dispatch('cellMouseover', 'cellMouseout', 'cellClick', 'rowMouseover', 'rowMouseout', 'rowClick');

	// Function handlers
	var _fn = {
		updateActiveSeries: function(d, i) {
			var seriesLabels = _element.g.chart.selectAll('.row text');

			if(null != d) {
				// Set the highlight on the row
				var seriesKey = _fn.seriesKey(d, i);
				seriesLabels.classed('active', function(series, ii) { return _fn.seriesKey(series, ii) == seriesKey; });
			}
			else {
				// Now update the style
				seriesLabels.classed('active', false);
			}
		},
		rowMouseover: function(d, i) {
			_fn.updateActiveSeries(d, i);
			_dispatch.call('rowMouseover', this, d, i);
		},
		rowMouseout: function(d, i) {
			_fn.updateActiveSeries();
			_dispatch.call('rowMouseout', this, d, i);
		},
		rowClick: function(d, i) {
			_dispatch.call('rowClick', this, d, i);
		},
		cellMouseover: function(d, i) {
			_dispatch.call('cellMouseover', this, d, i);
		},
		cellMouseout: function(d, i) {
			_dispatch.call('cellMouseout', this, d, i);
		},
		cellClick: function(d, i) {
			_dispatch.call('cellClick', this, d, i);
		},
		seriesKey: function(d) { return d.key; },
		seriesLabel: function(d) { return d.label; },
		seriesValues: function(d) { return d.values; },
		key: function(d) { return d.key; },
		value: function(d) { return d.value; }
	};

	// Extents
	var _extent = {
		x: extent().getValue(function(d, i) { return _fn.key(d, i); }),
		value: extent().getValue(function(d, i) { return _fn.value(d, i); }),
		multi: multiExtent()
	};

	// Scales for x, y, and color
	var _scale = {
		x: d3.scaleLinear(),
		y: d3.scaleOrdinal(),
		color: d3.scaleLinear().range([ '#e7e7e7', '#008500' ])
	};

	var _axis = {
		x: d3.axisTop().scale(_scale.x).tickSizeOuter(0).tickSizeInner(2)
	};

	var _element = {
		div: undefined,
		svg: undefined,
		g: {
			chart: undefined,
			xAxis: undefined
		}
	};

	var _data = [];

	var _instance = function () {};

	_instance.init = function(d3Container) {
		// Add the svg element
		_element.div = d3Container.append('div').attr('class', 'sentio matrix');
		_element.svg = _element.div.append('svg');

		// Add the axis
		_element.g.xAxis = _element.svg.append('g').attr('class', 'x axis');

		// Add a group for the chart itself
		_element.g.chart = _element.svg.append('g').attr('class', 'chart');

		_instance.resize();

		return _instance;
	};

	_instance.data = function(v) {
		if(!arguments.length) {
			return _data;
		}
		_data = (null != v)? v : [];
		return _instance;
	};

	_instance.resize = function() { };

	_instance.redraw = function() {
		// Determine the number of rows to render
		var rowCount = _data.length;

		// Determine the number of boxes to render (assume complete data)
		var boxes = [];
		if(rowCount > 0) {
			boxes = _fn.seriesValues(_data[0]);
		}
		var boxCount = boxes.length;

		// Dimensions of the visualization
		var cellSpan = _cellMargin + _cellSize;

		// calculate the width/height of the svg
		var width = boxCount*cellSpan + _cellMargin,
			height = rowCount*cellSpan + _cellMargin;

		// scale the svg to the right size
		_element.svg
			.attr('width', width + _margin.left + _margin.right)
			.attr('height', height + _margin.top + _margin.bottom);

		// Configure the scales
		_scale.x.domain(_extent.x.getExtent(boxes)).range([ 0, width - _cellMargin - cellSpan ]);
		_scale.color.domain(
			_extent.multi
				.values(_fn.seriesValues)
				.extent(_extent.value)
				.getExtent(_data));

		// Draw the x axis
		_element.g.xAxis.attr('transform', 'translate(' + (_margin.left + _cellMargin + _cellSize/2) + "," + _margin.top + ")");
		_element.g.xAxis.call(_axis.x);

		/**
		 * Chart Manipulation
		 */

		/*
		 * Row Join
		 */
		var row = _element.g.chart.selectAll('g.row').data(_data, _fn.seriesKey);

		/*
		 * Row Update Only
		 */

		/*
		 * Row Enter Only
		 * Build the row structure
		 */
		var rowEnter = row.enter().append('g');
		rowEnter
			.style('opacity', '0.1')
			.attr('class', 'row')
			.attr('transform', function(d, i) { return 'translate(' + _margin.left + ',' + (_margin.top + (cellSpan*i)) + ')'; })
			.on('mouseover', _fn.rowMouseover)
			.on('mouseout', _fn.rowMouseout)
			.on('click', _fn.rowClick);

		// Also must append the label of the row
		rowEnter.append('text')
			.attr('class', 'series label')
			.style('text-anchor', 'end')
			.attr('x', -6)
			.attr('y', _cellMargin + (_cellSize/2))
			.attr('dy', '.32em');

		// Also must append a line
		rowEnter.append('line')
			.attr('class', 'series tick')
			.attr('x1', -3)
			.attr('x2', 0)
			.attr('y1', _cellMargin + (_cellSize/2))
			.attr('y2', _cellMargin + (_cellSize/2));

		/*
		 * Row Enter + Update
		 */
		// Transition rows to their new positions
		var rowEnterUpdate = rowEnter.merge(row);
		rowEnterUpdate.transition().duration(_duration)
			.style('opacity', '1')
			.attr('transform', function(d, i) {
				return 'translate(' + _margin.left + ',' + (_margin.top + (cellSpan*i)) + ')';
			});

		// Update the series labels in case they changed
		rowEnterUpdate.select('text.series.label')
			.text(_fn.seriesLabel);

		/*
		 * Row Exit
		 */
		row.exit()
			.transition().duration(_duration)
			.style('opacity', '0.1')
			.remove();


		/*
		 * Cell Join - Will be done on row enter + exit
		 */
		var rowCell = rowEnterUpdate.selectAll('rect.cell')
			.data(_fn.seriesValues, _fn.key);

		/*
		 * Cell Update Only
		 */

		/*
		 * Cell Enter Only
		 */
		var rowCellEnter = rowCell.enter().append('rect')
			.attr('class', 'cell')
			.style('opacity', '0.1')
			.style('fill', function(d, i) { return _scale.color(_fn.value(d, i)); })
			.attr('x', function(d, i) { return _scale.x(_fn.key(d, i)) + _cellMargin; })
			.attr('y', _cellMargin)
			.attr('height', _cellSize)
			.attr('width', _cellSize)
			.on('mouseover', _fn.cellMouseover)
			.on('mouseout', _fn.cellMouseout)
			.on('click', _fn.cellClick);

		/*
		 * Cell Enter + Update
		 * Update fill, move to proper x coordinate
		 */
		var rowCellEnterUpdate = rowCellEnter.merge(rowCell);
		rowCellEnterUpdate.transition().duration(_duration)
			.style('opacity', '1')
			.attr('x', function(d, i) { return _scale.x(_fn.key(d, i)) + _cellMargin; })
			.style('fill', function(d, i) { return _scale.color(_fn.value(d, i)); });

		/*
		 * Cell Remove
		 */
		rowCell.exit().transition().duration(_duration)
			.attr('width', 0)
			.style('opacity', '0.1')
			.remove();

		return _instance;
	};


	_instance.cellSize = function(v) {
		if(!arguments.length) { return _cellSize; }
		_cellSize = v;
		return _instance;
	};
	_instance.cellMargin = function(v) {
		if(!arguments.length) { return _cellMargin; }
		_cellMargin = v;
		return _instance;
	};
	_instance.margin = function(v) {
		if(!arguments.length) { return _margin; }
		_margin = v;
		return _instance;
	};

	_instance.duration = function(v) {
		if(!arguments.length) { return _duration; }
		_duration = v;
		return _instance;
	};

	_instance.seriesKey = function(v) {
		if(!arguments.length) { return _fn.seriesKey; }
		_fn.seriesKey = v;
		return _instance;
	};
	_instance.seriesLabel = function(v) {
		if(!arguments.length) { return _fn.seriesLabel; }
		_fn.seriesLabel = v;
		return _instance;
	};
	_instance.seriesValues = function(v) {
		if(!arguments.length) { return _fn.seriesValues; }
		_fn.seriesValues = v;
		return _instance;
	};
	_instance.key = function(v) {
		if(!arguments.length) { return _fn.key; }
		_fn.key = v;
		return _instance;
	};
	_instance.value = function(v) {
		if(!arguments.length) { return _fn.value; }
		_fn.value = v;
		return _instance;
	};

	_instance.colorScale = function(v) {
		if(!arguments.length) { return _scale.color; }
		_scale.color = v;
		return _instance;
	};
	_instance.xScale = function(v) {
		if(!arguments.length) { return _scale.xScale; }
		_scale.xScale = v;
		_axis.x.scale(v);
		return _instance;
	};
	_instance.yScale = function(v) {
		if(!arguments.length) { return _scale.yScale; }
		_scale.yScale = v;
		return _instance;
	};

	_instance.xExtent = function(v) {
		if(!arguments.length) { return _extent.x; }
		_extent.x = v;
		_extent.x.getValue(function(d, i) { return v(d, i); });
		return _instance;
	};
	_instance.valueExtent = function(v) {
		if(!arguments.length) { return _extent.value; }
		_extent.value = v;
		_extent.value.getValue(function(d, i) { return v(d, i); });
		return _instance;
	};

	_instance.dispatch = function() {
		return _dispatch;
	};

	return _instance;
}

export { matrix };
