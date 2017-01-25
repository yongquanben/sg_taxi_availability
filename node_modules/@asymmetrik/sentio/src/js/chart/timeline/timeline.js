import { extent } from '../../model/extent';
import { multiExtent } from '../../model/multi-extent';
import { timelineBrush } from '../../controller/timeline-brush';

function timeline() {

	var _id = 'timeline_line_' + Date.now();

	// Margin between the main plot group and the svg border
	var _margin = { top: 10, right: 10, bottom: 20, left: 40 };

	// Height and width of the SVG element
	var _height = 100, _width = 600;

	var _fn = {
		valueX: function(d) { return d[0]; },
		valueY: function(d) { return d[1]; },

		markerValueX: function(d) { return d[0]; },
		markerLabel: function(d) { return d[1]; },

		seriesKey: function(d) { return d.key; },
		seriesValues: function(d) { return d.values; },
		seriesLabel: function(d) { return d.label; }
	};

	// Default accessors for the dimensions of the data
	var _value = {
		x: function(d) { return d[0]; },
		y: function(d) { return d[1]; }
	};

	// Accessors for the positions of the markers
	var _markerValue = {
		x: function(d, i) { return d[0]; },
		label: function(d, i) { return d[1]; }
	};

	// Extent configuration for x and y dimensions of plot
	var now = Date.now();
	var _extent = {
		x: extent({
			defaultValue: [ now - 60000*5, now ],
			getValue: function(d, i) { return _fn.valueX(d, i); }
		}),
		y: extent({
			getValue: function(d, i) { return _fn.valueY(d, i); }
		})
	};
	var _multiExtent = multiExtent().values(function(d, i) { return _fn.seriesValues(d, i); });

	// Default scales for x and y dimensions
	var _scale = {
		x: d3.scaleTime(),
		y: d3.scaleLinear()
	};

	// Default Axis definitions
	var _axis = {
		x: d3.axisBottom().scale(_scale.x),
		y: d3.axisLeft().scale(_scale.y).ticks(3)
	};

	// Storage for commonly used DOM elements
	var _element = {
		svg: undefined,
		g: {
			container: undefined,
			plots: undefined,
			xAxis: undefined,
			yAxis: undefined,
			markers: undefined,
			brush: undefined
		},
		plotClipPath: undefined,
		markerClipPath: undefined
	};

	// Line generator for the plot
	var _line = d3.line();
	_line.x(function(d, i) {
		return _scale.x(_fn.valueX(d, i));
	});
	_line.y(function(d, i) {
		return _scale.y(_fn.valueY(d, i));
	});

	// Area generator for the plot
	var _area = d3.area();
	_area.x(function(d, i) {
		return _scale.x(_fn.valueX(d, i));
	});
	_area.y1(function(d, i) {
		return _scale.y(_fn.valueY(d, i));
	});


	// Brush Management
	var _brush = timelineBrush({ brush: d3.brushX(), scale: _scale.x });
	_brush.dispatch()
		.on('end', function() { _dispatch.call('filterend', this, getBrush()); })
		.on('start', function() { _dispatch.call('filterstart', this, getBrush()); })
		.on('brush', function() { _dispatch.call('filter', this, getBrush()); });



	/**
	 * Get the current brush state in terms of the x data domain, in ms epoch time
	 */
	function getBrush() {

		// Try to get the node from the brush group selection
		var node = (null != _element.g.brush)? _element.g.brush.node() : null;

		// Get the current brush selection
		return _brush.getSelection(node);

	}

	/**
	 * Set the current brush state in terms of the x data domain
	 * @param v The new value of the brush
	 *
	 */
	function setBrush(v) {
		_brush.setSelection(_element.g.brush, v);
	}

	/**
	 * Update the state of the brush (as part of redrawing everything)
	 *
	 * The purpose of this function is to update the state of the brush to reflect changes
	 * to the rest of the chart as part of a normal update/redraw cycle. When the x extent
	 * changes, the brush needs to move to stay correctly aligned with the x axis. Normally,
	 * we are only updating the drawn position of the brush, so the brushSelection doesn't
	 * actually change. However, if the change results in the brush extending partially or
	 * wholly outside of the x extent, we might have to clip or clear the brush, which will
	 * result in filter change events being propagated.
	 *
	 * @param previousExtent The previous state of the brush extent. Must be provided to
	 *        accurately determine the extent of the brush in terms of the x data domain
	 */
	function updateBrush(previousExtent) {

		// If there was no previous extent, then there is no brush to update
		if (null != previousExtent) {

			// Derive the overall plot extent from the collection of series
			var plotExtent = _multiExtent.extent(_extent.x).getExtent(_data);

			if(null != plotExtent && Array.isArray(plotExtent) && plotExtent.length == 2) {

				// Clip extent by the full extent of the plot (this is in case we've slipped off the visible plot)
				var newExtent = [ Math.max(plotExtent[0], previousExtent[0]), Math.min(plotExtent[1], previousExtent[1]) ];
				setBrush(newExtent);

			}
			else {
				// There is no plot/data so just clear the filter
				setBrush(undefined);
			}
		}

		_element.g.brush
			.style('display', (_brush.enabled())? 'unset' : 'none')
			.call(_brush.brush());
	}


	// The dispatch object and all events
	var _dispatch = d3.dispatch('filter', 'filterstart', 'filterend', 'markerClick', 'markerMouseover', 'markerMouseout')

	// The main data array
	var _data = [];

	// Markers data
	var _markers = {
		values: []
	};

	// Chart create/init method
	function _instance() {}


	/**
	 * Initialize the chart (only called once). Performs all initial chart creation/setup
	 *
	 * @param container The container element to which to apply the chart
	 * @returns {_instance} Instance of the chart
	 */
	_instance.init = function(container) {
		// Create a container div
		_element.div = container.append('div').attr('class', 'sentio timeline');

		// Create the SVG element
		_element.svg = _element.div.append('svg');

		// Add the defs and add the clip path definition
		_element.plotClipPath = _element.svg.append('defs').append('clipPath').attr('id', 'plot_' + _id).append('rect');
		_element.markerClipPath = _element.svg.append('defs').append('clipPath').attr('id', 'marker_' + _id).append('rect');

		// Append a container for everything
		_element.g.container = _element.svg.append('g');

		// Append the path group (which will have the clip path and the line path
		_element.g.plots = _element.g.container.append('g').attr('class', 'plots').attr('clip-path', 'url(#plot_' + _id + ')');

		// Add the filter brush element
		_element.g.brush = _element.g.container.append('g').attr('class', 'x brush').attr('clip-path', 'url(#marker_' + _id + ')');

		// Append a group for the markers
		_element.g.markers = _element.g.container.append('g').attr('class', 'markers').attr('clip-path', 'url(#marker_' + _id + ')');

		// Append groups for the axes
		_element.g.xAxis = _element.g.container.append('g').attr('class', 'x axis');
		_element.g.yAxis = _element.g.container.append('g').attr('class', 'y axis');

		_instance.resize();

		return _instance;
	};

	/*
	 * Set the _instance data
	 */
	_instance.data = function(v) {
		if (!arguments.length) { return _data; }
		_data = (null != v)? v : [];

		return _instance;
	};

	/*
	 * Set the markers data
	 */
	_instance.markers = function(v) {
		if (!arguments.length) { return _markers.values; }
		_markers.values = (null != v)? v : [];
		return _instance;
	};

	/*
	 * Updates all the elements that depend on the size of the various components
	 */
	_instance.resize = function() {

		// Need to grab the brush extent before we change anything
		var brushSelection = getBrush();

		// Set up the scales
		_scale.x.range([ 0, Math.max(0, _width - _margin.left - _margin.right) ]);
		_scale.y.range([ Math.max(0, _height - _margin.top - _margin.bottom), 0 ]);

		// Append the clip path
		_element.plotClipPath
			.attr('transform', 'translate(0, -' + _margin.top + ')')
			.attr('width', Math.max(0, _width - _margin.left - _margin.right))
			.attr('height', Math.max(0, _height - _margin.bottom));
		_element.markerClipPath
			.attr('transform', 'translate(0, -' + _margin.top + ')')
			.attr('width', Math.max(0, _width - _margin.left - _margin.right))
			.attr('height', Math.max(0, _height - _margin.bottom));

		// Now update the size of the svg pane
		_element.svg.attr('width', _width).attr('height', _height);

		// Update the positions of the axes
		_element.g.xAxis.attr('transform', 'translate(0,' + _scale.y.range()[0] + ')');
		_element.g.yAxis.attr('class', 'y axis');

		// update the margins on the main draw group
		_element.g.container.attr('transform', 'translate(' + _margin.left + ',' + _margin.top + ')');

		// Update the size of the brush
		_element.g.brush
			.selectAll('rect')
			.attr('y', 0).attr('x', 0)
			.attr('height', _width - _margin.left - _margin.right)
			.attr('height', _height - _margin.top - _margin.bottom + 4);

		_brush.brush()
			.extent([ [ 0, 0 ], [ _width - _margin.left - _margin.right, _height - _margin.top - _margin.bottom ] ]);

		updateBrush(brushSelection);

		return _instance;
	};

	/*
	 * Redraw the graphic
	 */
	_instance.redraw = function() {

		// Need to grab the brush extent before we change anything
		var brushSelection = getBrush();

		// Update the x domain (to the latest time window)
		_scale.x.domain(_multiExtent.extent(_extent.x).getExtent(_data));

		// Update the y domain (based on configuration and data)
		_scale.y.domain(_multiExtent.extent(_extent.y).getExtent(_data));

		// Update the plot elements
		updateAxes();
		updateLine();
		updateMarkers();
		updateBrush(brushSelection);

		return _instance;
	};

	function updateAxes() {
		if (null != _axis.x) {
			_element.g.xAxis.call(_axis.x);
		}
		if (null != _axis.y) {
			_element.g.yAxis.call(_axis.y);
		}
	}

	function updateLine() {

		// Join
		var plotJoin = _element.g.plots
			.selectAll('.plot')
			.data(_data, _fn.seriesKey);

		// Enter
		var plotEnter = plotJoin.enter().append('g')
			.attr('class', 'plot');

		var lineEnter = plotEnter.append('g').append('path').attr('class', function(d) { return ((d.cssClass)? d.cssClass : '') + ' line'; });
		var areaEnter = plotEnter.append('g').append('path').attr('class', function(d) { return ((d.cssClass)? d.cssClass : '') + ' area'; });

		var lineUpdate = plotJoin.select('.line');
		var areaUpdate = plotJoin.select('.area');

		// Enter + Update
		lineEnter.merge(lineUpdate).datum(_fn.seriesValues).attr('d', _line);
		areaEnter.merge(areaUpdate).datum(_fn.seriesValues).attr('d', _area.y0(_scale.y.range()[0]));

		// Exit
		var plotExit = plotJoin.exit();
		plotExit.remove();

	}

	function updateMarkers() {

		// Join
		var markerJoin = _element.g.markers
			.selectAll('.marker')
			.data(_markers.values, _markerValue.x);

		// Enter
		var markerEnter = markerJoin.enter().append('g')
			.attr('class', 'marker')
			.on('mouseover', function(d, i) { _dispatch.call('markerMouseover', this, d, i); })
			.on('mouseout', function(d, i) { _dispatch.call('markerMouseout', this, d, i); })
			.on('click', function(d, i) { _dispatch.call('markerClick', this, d, i); });

		var lineEnter = markerEnter.append('line');
		var textEnter = markerEnter.append('text');

		lineEnter
			.attr('y1', function(d) { return _scale.y.range()[1]; })
			.attr('y2', function(d) { return _scale.y.range()[0]; });

		textEnter
			.attr('dy', '0em')
			.attr('y', -3)
			.attr('text-anchor', 'middle')
			.text(_markerValue.label);

		// Enter + Update
		var lineUpdate = markerJoin.select('line');
		var textUpdate = markerJoin.select('text');

		lineEnter.merge(lineUpdate)
			.attr('x1', function(d, i) { return _scale.x(_markerValue.x(d, i)); })
			.attr('x2', function(d, i) { return _scale.x(_markerValue.x(d)); });

		textEnter.merge(textUpdate)
			.attr('x', function(d, i) { return _scale.x(_markerValue.x(d)); });

		// Exit
		markerJoin.exit().remove();

	}


	// Basic Getters/Setters
	_instance.width = function(v) {
		if (!arguments.length) { return _width; }
		_width = v;
		return _instance;
	};
	_instance.height = function(v) {
		if (!arguments.length) { return _height; }
		_height = v;
		return _instance;
	};
	_instance.margin = function(v) {
		if (!arguments.length) { return _margin; }
		_margin = v;
		return _instance;
	};
	_instance.curve = function(v) {
		if (!arguments.length) { return _line.curve(); }
		_line.curve(v);
		_area.curve(v);
		return _instance;
	};
	_instance.xAxis = function(v) {
		if (!arguments.length) { return _axis.x; }
		_axis.x = v;
		return _instance;
	};
	_instance.yAxis = function(v) {
		if (!arguments.length) { return _axis.y; }
		_axis.y = v;
		return _instance;
	};
	_instance.xScale = function(v) {
		if (!arguments.length) { return _scale.x; }
		_scale.x = v;
		if (null != _axis.x) {
			_axis.x.scale(v);
		}
		if (null != _brush) {
			_brush.scale(v);
		}
		return _instance;
	};
	_instance.yScale = function(v) {
		if (!arguments.length) { return _scale.y; }
		_scale.y = v;
		if (null != _axis.y) {
			_axis.y.scale(v);
		}
		return _instance;
	};
	_instance.xValue = function(v) {
		if (!arguments.length) { return _value.x; }
		_value.x = v;
		return _instance;
	};
	_instance.yValue = function(v) {
		if (!arguments.length) { return _value.y; }
		_value.y = v;
		return _instance;
	};
	_instance.yExtent = function(v) {
		if (!arguments.length) { return _extent.y; }
		_extent.y = v;
		return _instance;
	};
	_instance.xExtent = function(v) {
		if (!arguments.length) { return _extent.x; }
		_extent.x = v;
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
	_instance.markerXValue = function(v) {
		if (!arguments.length) { return _markerValue.x; }
		_markerValue.x = v;
		return _instance;
	};
	_instance.markerLabel = function(v) {
		if (!arguments.length) { return _markerValue.label; }
		_markerValue.label = v;
		return _instance;
	};
	_instance.dispatch = function(v) {
		if (!arguments.length) { return _dispatch; }
		return _instance;
	};
	_instance.filter = function(v) {
		if (!arguments.length) { return _brush.enabled(); }
		_brush.enabled(v);
		return _instance;
	};
	_instance.setFilter = function(v) {
		setBrush(v);
		return _instance;
	};
	_instance.getFilter = function() {
		return getBrush();
	};

	return _instance;
}

export { timeline };
