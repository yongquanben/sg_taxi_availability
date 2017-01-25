/*! @asymmetrik/sentio-3.0.2 - Copyright Asymmetrik, Ltd. 2007-2017 - All Rights Reserved.*/
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.sentio = global.sentio || {})));
}(this, (function (exports) { 'use strict';

function donut() {

	// Chart height/width
	var _width = 400;
	var _height = 400;
	var _margin = { top: 2, bottom: 2, right: 2, left: 2 };

	// Inner and outer radius settings
	var _radius;
	var _innerRadiusRatio = 0.7;

	// Transition duration
	var _duration = 500;

	// Legend configuration
	var _legend = {
		enabled: true,
		markSize: 16,
		markMargin: 8,
		labelOffset: 2,
		position: 'center', // only option right now
		layout: 'vertical'
	};

	// d3 dispatcher for handling events
	var _dispatch = d3.dispatch('mouseover', 'mouseout', 'click');

	// Function handlers
	var _fn = {
		getEventElement: function(d, i) {
			return (null != d && null != d.data)? d.data : d;
		},
		updateActiveElement: function(d, i) {
			var legendEntries = _element.gLegend.selectAll('g.entry');
			var arcs = _element.gChart.selectAll('path.arc');

			if(null != d) {
				// Set the highlight on the row
				var key = _fn.key(d, i);
				legendEntries.classed('active', function(e, ii) {
					return _fn.key(e, ii) == key;
				});
				arcs.classed('active', function(e, ii) {
					return _fn.key(e.data, ii) == key;
				});
			}
			else {
				legendEntries.classed('active', false);
				arcs.classed('active', false);
			}
		},
		mouseover: function(d, i) {
			d = _fn.getEventElement(d, i);
			_fn.updateActiveElement(d, i);
			_dispatch.call('mouseover', this, d, i);
		},
		mouseout: function(d, i) {
			d = _fn.getEventElement(d, i);
			_fn.updateActiveElement();
			_dispatch.call('mouseout', this, d, i);
		},
		click: function(d, i) {
			d = _fn.getEventElement(d, i);
			_dispatch.call('click', this, d, i);
		},
		key: function(d) { return d.key; },
		value: function(d) { return d.value; },
		label: function(d) { return d.key + ' (' + d.value + ')'; }
	};


	var _scale = {
		color: d3.scaleOrdinal(d3.schemeCategory10)
	};

	var _layout = {
		arc: d3.arc().padAngle(0.01),
		pie: d3.pie().value(function(d, i) { return _fn.value(d, i); }).sort(null)
	};

	// elements
	var _element = {
		div: undefined,
		svg: undefined,
		gChart: undefined,
		legend: undefined
	};

	var _data = [];

	// Chart create/init method
	function _instance(selection) { }

	/*
	 * Initialize the chart (should only call this once). Performs all initial chart
	 * creation and setup
	 */
	_instance.init = function(container) {
		// Create the DIV element
		_element.div = container.append('div').attr('class', 'sentio donut');

		// Create the svg element
		_element.svg = _element.div.append('svg');

		// Create the main chart group
		_element.gChart = _element.svg.append('g').attr('class', 'chart');

		// Create a group for the legend
		_element.gLegend = _element.svg.append('g').attr('class', 'legend');

		_instance.resize();

		return _instance;
	};

	/*
	 * Set the _instance data
	 */
	_instance.data = function(v) {
		if(!arguments.length) { return _data; }
		_data = (null != v)? v : [];
		return _instance;
	};

	/*
	 * Updates all the elements that depend on the size of the various components
	 */
	_instance.resize = function() {
		var chartWidth = _width - _margin.right - _margin.left;
		var chartHeight = _height - _margin.top - _margin.bottom;
		_radius = (Math.min(chartHeight, chartWidth))/2;

		_element.svg
			.attr('width', _width)
			.attr('height', _height);

		_element.gChart
			.attr('transform', 'translate(' + (_margin.left + _radius) + ',' + (_margin.top + _radius) + ')');

		// The outer radius is half of the lesser of the two (chartWidth/chartHeight)
		_layout.arc.innerRadius(_radius * _innerRadiusRatio).outerRadius(_radius);

		// Update legend positioning
		_element.gLegend.attr('transform', legendTransform());

		return _instance;
	};

	/*
	 * Redraw the graphic
	 */
	_instance.redraw = function() {

		redrawChart();

		if (_legend.enabled) {
			redrawLegend();
		}

		return _instance;
	};

	/**
	 * Private functions
	 */
	function redrawChart() {
		/*
		 * Join the data
		 */
		var g = _element.gChart.selectAll('path.arc')
			.data(_layout.pie(_data), function(d, i) { return _fn.key(d.data, i); });

		/*
		 * Update Only
		 */

		/*
		 * Enter Only
		 * Create the path, add the arc class, register the callbacks
		 * Grow from 0 for both start and end angles
		 */
		var gEnter = g.enter().append('path')
			.attr('class', 'arc')
			.on('mouseover', _fn.mouseover)
			.on('mouseout', _fn.mouseout)
			.on('click', _fn.click)
			.each(function(d) { this._current = { startAngle: 0, endAngle: 0 }; });

		/*
		 * Enter + Update
		 * Apply the update from current angle to next angle
		 */
		var gEnterUpdate = gEnter.merge(g);
		gEnterUpdate.transition().duration(_duration)
			.attrTween('d', function(d) {
				var interpolate = d3.interpolate(this._current, d);
				this._current = interpolate(0);
				return function(t) {
					return _layout.arc(interpolate(t));
				};
			});

		gEnterUpdate
			.attr('key', function(d, i) { return _fn.key(d.data, i); })
			.attr('fill', function(d, i) { return _scale.color(_fn.key(d.data, i)); });

		/*
		 * Exit
		 */
		g.exit().remove();
	}

	function legendTransform() {
		var entrySpan = _legend.markSize + _legend.markMargin;

		// Only option is 'center' for now
		if (_legend.position === 'center') {
			// The center position of the chart
			var centerX = _margin.left + _radius;
			var centerY = _margin.top + _radius;
			var legendWidth = (null == _element.gLegend._maxWidth)? 0 : _element.gLegend._maxWidth;
			var legendHeight = entrySpan*_data.length + _legend.markMargin;

			var offsetX = legendWidth/2;
			var offsetY = legendHeight/2;

			return 'translate(' + (centerX - offsetX) + ',' + (centerY - offsetY) + ')';
		}
		else {
			// TODO
		}
	}

	function redrawLegend() {
		/*
		 * Join the data
		 */
		var gLegendGroup = _element.gLegend.selectAll('g.entry').data(_data, _fn.key);

		/*
		 * Enter Only
		 * Create a g (gLegendGroup) to add the rect & text label,
		 * register the callbacks, apply the transform to position each gLegendGroup
		 */
		var gLegendGroupEnter = gLegendGroup.enter().append('g')
			.attr('class', 'entry')
			.attr('transform', function(d, i) { return 'translate(0, ' + (i*(_legend.markSize + _legend.markMargin)) + ')'; } )
			.on('mouseover', _fn.mouseover)
			.on('mouseout', _fn.mouseout)
			.on('click', _fn.click);

		// Add the legend's rect
		var rect = gLegendGroupEnter
			.append('rect')
			.attr('width', _legend.markSize)
			.attr('height', _legend.markSize);

		// Add the legend text
		var text = gLegendGroupEnter
			.append('text')
			.attr('x', _legend.markSize + _legend.markMargin)
			.attr('y', _legend.markSize - _legend.labelOffset);

		/*
		 * Enter + Update
		 */
		text.merge(gLegendGroup.select('text')).text(_fn.label);

		rect.merge(gLegendGroup.select('rect'))
			.style('fill', function(d, i) { return _scale.color(_fn.key(d, i)); });

		// Position each rect on both enter and update to fully account for changing widths and sizes
		gLegendGroupEnter.merge(gLegendGroup)
			// Iterate over all the legend keys to get the max width and store it in gLegendGroup._maxWidth
			.each(function(d, i) {
				if (i === 0) {
					// Reset
					_element.gLegend._maxWidth = this.getBBox().width;
				}
				else {
					_element.gLegend._maxWidth = Math.max(this.getBBox().width, _element.gLegend._maxWidth);
				}
			});

		// Reassert the legend position
		_element.gLegend.attr('transform', legendTransform());

		/*
		 * Exit
		 */
		gLegendGroup.exit().remove();
	}

	// Basic Getters/Setters
	_instance.width = function(v) {
		if(!arguments.length) { return _width; }
		_width = v;
		return _instance;
	};
	_instance.height = function(v) {
		if(!arguments.length) { return _height; }
		_height = v;
		return _instance;
	};

	_instance.innerRadiusRatio = function(v) {
		if(!arguments.length) { return _innerRadiusRatio; }
		_innerRadiusRatio = v;
		return _instance;
	};

	_instance.duration = function(v) {
		if(!arguments.length) { return _duration; }
		_duration = v;
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
	_instance.label = function(v) {
		if(!arguments.length) { return _fn.label; }
		_fn.label = v;
		return _instance;
	};
	_instance.colorScale = function(v) {
		if(!arguments.length) { return _scale.color; }
		_scale.color = v;
		return _instance;
	};

	_instance.dispatch = function() {
		return _dispatch;
	};

	_instance.legend = function(v) {
		if(!arguments.length) { return _legend; }
		_legend = v;
		return _instance;
	};

	return _instance;
}

function extent(config) {

	/**
	 * Private variables
	 */
	// Configuration
	var _config = {
		defaultValue: [ 0, 10 ],
		overrideValue: undefined
	};

	var _fn = {
		getValue: function(d) { return d; },
		filter: function() { return true; }
	};


	/**
	 * Private Functions
	 */

	function setDefaultValue(v) {
		if(null == v || 2 !== v.length || isNaN(v[0]) || isNaN(v[1]) || v[0] >= v[1]) {
			throw new Error('Default extent must be a two element ordered array of numbers');
		}
		_config.defaultValue = v;
	}

	function setOverrideValue(v) {
		if(null != v && 2 !== v.length) {
			throw new Error('Extent override must be a two element array or null/undefined');
		}
		_config.overrideValue = v;
	}

	function setGetValue(v) {
		if(typeof v !== 'function') {
			throw new Error('Value getter must be a function');
		}

		_fn.getValue = v;
	}

	function setFilter(v) {
		if(typeof v !== 'function') {
			throw new Error('Filter must be a function');
		}

		_fn.filter = v;
	}

	/*
	 * Constructor/initialization method
	 */
	function _instance(extentConfig) {
		if(null != extentConfig) {
			if(null != extentConfig.defaultValue) { setDefaultValue(extentConfig.defaultValue); }
			if(null != extentConfig.overrideValue) { setOverrideValue(extentConfig.overrideValue); }
			if(null != extentConfig.getValue) { setGetValue(extentConfig.getValue); }
			if(null != extentConfig.filter) { setFilter(extentConfig.filter); }
		}
	}


	/**
	 * Public API
	 */

	/*
	 * Get/Set the default value for the extent
	 */
	_instance.defaultValue = function(v) {
		if(!arguments.length) { return _config.defaultValue; }
		setDefaultValue(v);
		return _instance;
	};

	/*
	 * Get/Set the override value for the extent
	 */
	_instance.overrideValue = function(v) {
		if(!arguments.length) { return _config.overrideValue; }
		setOverrideValue(v);
		return _instance;
	};

	/*
	 * Get/Set the value accessor for the extent
	 */
	_instance.getValue = function(v) {
		if(!arguments.length) { return _fn.getValue; }
		setGetValue(v);
		return _instance;
	};

	/*
	 * Get/Set the filter fn for the extent
	 */
	_instance.filter = function(v) {
		if(!arguments.length) { return _fn.filter; }
		setFilter(v);
		return _instance;
	};

	/*
	 * Calculate the extent given some data.
	 * - Default values are used in the absence of data
	 * - Override values are used to clamp or extend the extent
	 */
	_instance.getExtent = function(data) {
		var toReturn;
		var ov = _config.overrideValue;

		// Check to see if we need to calculate the extent
		if(null == ov || null == ov[0] || null == ov[1]) {
			// Since the override isn't complete, we need to calculate the extent
			toReturn = [ Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY ];
			var foundData = false;

			if(null != data) {
				// Iterate over each element of the data
				data.forEach(function(element, i) {
					// If the element passes the filter, then update the extent
					if(_fn.filter(element, i)) {
						foundData = true;
						var v = _fn.getValue(element, i);
						toReturn[0] = Math.min(toReturn[0], v);
						toReturn[1] = Math.max(toReturn[1], v);
					}
				});
			}

			// If we didn't find any data, use the default values
			if(!foundData) {
				toReturn = _config.defaultValue;
			}

			// Apply the overrides
			// - Since we're in this conditional, only one or zero overrides were specified
			if(null != ov) {
				if(null != ov[0]) {
					// Set the lower override
					toReturn[0] = ov[0];
					if(toReturn[0] > toReturn[1]) {
						toReturn[1] = toReturn[0];
					}
				}
				if(null != ov[1]) {
					toReturn[1] = ov[1];
					if(toReturn[1] < toReturn[0]) {
						toReturn[0] = toReturn[1];
					}
				}
			}
		}
		else {
			// Since the override is fully specified, use it
			toReturn = ov;
		}

		return toReturn;
	};


	// Initialize the model
	_instance(config);

	return _instance;
}

function multiExtent(config) {

	/**
	 * Private variables
	 */

	var _fn = {
		values: function(d) { return d.values; }
	};

	var _extent = extent();

	/**
	 * Private Functions
	 */

	function setExtent(v) {
		_extent = v;
	}

	/*
	 * Constructor/initialization method
	 */
	function _instance(config) {
		if(null != config && null != config.extent) {
			setExtent(config.extent);
		}
	}


	/**
	 * Public API
	 */

	/*
	 * Get/Set the extent to use
	 */
	_instance.extent = function(v) {
		if(!arguments.length) { return _extent; }
		setExtent(v);
		return _instance;
	};

	/*
	 * Get/Set the values accessor function
	 */
	_instance.values = function(v) {
		if(!arguments.length) { return _fn.values; }
		_fn.values = v;
		return _instance;
	};

	/*
	 * Calculate the extent given some data.
	 * - Default values are used in the absence of data
	 * - Override values are used to clamp or extend the extent
	 */
	_instance.getExtent = function(data) {
		var toReturn;

		data.forEach(function(e, i) {
			var tExtent = _extent.getExtent(_fn.values(e, i));
			if(null == toReturn) {
				toReturn = tExtent;
			}
			else {
				toReturn[0] = Math.min(toReturn[0], tExtent[0]);
				toReturn[1] = Math.max(toReturn[1], tExtent[1]);
			}
		});

		// In case there was no data
		if(null == toReturn) {
			toReturn = _extent.getExtent([]);
		}

		return toReturn;
	};

	// Initialize the model
	_instance(config);

	return _instance;
}

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

function timelineBrush(config) {

	/**
	 * Private variables
	 */

	// The brush object
	var _brush;

	// The scale object to use for mapping between the domain and range
	var _scale;

	// Event dispatcher
	var _dispatch = d3.dispatch('brush', 'start', 'end');

	// The current state of the brush selection
	var _selection = undefined;

	// Enable or disable the brush
	var _enabled = false;

	// Flag to track programmatic changes
	var _programmaticChange = false;


	/**
	 * Private Functions
	 */

	function setEnabled(v) {
		// Should probably fire event for new brush state
		_enabled = v;
	}

	function getEnabled() {
		return _enabled && null != _brush;
	}

	/**
	 * Convert a brushSelection to ms epoch time
	 * @param brushSelection Null, or an array brushSelection that may be in either Date or ms epoch
	 *        time representation
	 * @returns {*} Brush selection in ms epoch time form
	 */
	function convertSelection(selection) {
		if(null != selection && Array.isArray(selection)) {
			selection = selection.map(function(d) { return +d; });
		}

		return selection;
	}

	/**
	 * Clean selection to make sure it's valid or set it to undefined if it's invalid
	 * @param selection
	 * @returns {*}
	 */
	function cleanSelection(selection) {
		if(!Array.isArray(selection) || selection.length != 2 || isNaN(selection[0]) || isNaN(selection[1])) {
			selection = undefined;
		}

		return selection;
	}

	/**
	 * Wrapper for event handler to filter out duplicate events
	 * @param eventType
	 * @returns {Function}
	 */
	function eventFilter(eventType) {
		return function(args) {

			var n = (null != d3.event.selection)? convertSelection(d3.event.selection.map(_scale.invert)) : undefined;
			var o = _selection;

			// Fire the event if the extents are different
			var duplicateEvent = n === o || (null != n && null != o && n[0] === o[0] && n[1] === o[1]);
			var fireEvent = !(duplicateEvent && _programmaticChange);

			// Store the new selection only on the 'end' event
			if(eventType === 'end') {
				// Reset the selection
				_selection = n;

				// Reset the flag
				_programmaticChange = false;
			}

			// Suppress event if it's duplicate and programmatic
			if(fireEvent) {
				_dispatch.apply(eventType, this, args);
			}
		}
	}

	function getSelection(node) {
		var selection = undefined;

		if(_enabled && null != node && null != _scale) {
			selection = d3.brushSelection(node);

			if (null != selection && Array.isArray(selection)) {
				selection = convertSelection(selection.map(_scale.invert));
			}
			else {
				selection = undefined;
			}
		}

		return selection;
	}

	function setSelection(group, v) {
		v = cleanSelection(v);

		var clearFilter = (null == v || v[0] >= v[1]);

		// either clear the filter or move it
		_programmaticChange = true;
		if(clearFilter) {
			_brush.move(group, undefined);
		}
		else {
			_brush.move(group, v.map(_scale));
		}
	}

	function _instance(config) {

		if (null != config) {
			if (null != config.brush) {
				_brush = config.brush;
				_brush
					.on('brush', eventFilter('brush'))
					.on('start', eventFilter('start'))
					.on('end', eventFilter('end'));
			}
			else {
				throw new Error('Must provide a brush');
			}

			if (null != config.scale) {
				_scale = config.scale;
			}
			else {
				throw new Error('Must provide a scale');
			}

			if (null != config.enabled) { setEnabled(config.enabled); }
		}
		else {
			throw new Error('Must provide a brush and a scale');
		}
	}


	/**
	 * Public API
	 */

	_instance.scale = function(v) {
		if(!arguments.length) { return _scale; }
		_scale = v;
		return _instance;
	};

	_instance.dispatch = function() {
		return _dispatch;
	};

	_instance.brush = function() {
		return _brush;
	};

	// Get/Set enabled state
	_instance.enabled = function(v) {
		if(!arguments.length) { return getEnabled(); }
		setEnabled(v);
		return _instance;
	};

	_instance.getSelection = function(node) {
		return getSelection(node);
	};

	_instance.setSelection = function(group, v) {
		return setSelection(group, v);
	};

	// Initialize the model
	_instance(config);

	return _instance;
}

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
	var _dispatch = d3.dispatch('filter', 'filterstart', 'filterend', 'markerClick', 'markerMouseover', 'markerMouseout');

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

function realtimeTimeline() {

	// Default data delay, this is the difference between now and the latest tick shown on the timeline
	var _delay = 0;

	// Interval of the timeline, this is the amount of time being displayed by the timeline
	var _interval = 60000;

	// Is the timeline running?
	var _running = false;
	var _timeout = null;

	// What is the refresh rate?
	var _fps = 32;

	var _instance = timeline();
	_instance.yExtent().filter(function(d) {
		var x = _instance.xValue()(d);
		var xExtent = _instance.xExtent().getExtent();
		return (x < xExtent[1] && x > xExtent[0]);
	});

	/*
	 * This is the main update loop function. It is called every time the
	 * _instance is updating to proceed through time.
	 */
	function tick() {
		// If not running, let the loop die
		if(!_running) return;

		_instance.redraw();

		// Schedule the next update
		_timeout = window.setTimeout(tick, (_fps > 0)? 1000/_fps : 0);
	}

	/*
	 * Redraw the graphic
	 */
	var parentRedraw = _instance.redraw;
	_instance.redraw = function() {
		// Update the x domain (to the latest time window)
		var now = new Date();
		_instance.xExtent().overrideValue([ now - _delay - _interval, now - _delay ]);

		parentRedraw();
		return _instance;
	};

	_instance.start = function() {
		if(_running) { return; }
		_running = true;

		tick();
		return _instance;
	};

	_instance.stop = function() {
		_running = false;

		if(_timeout != null) {
			window.clearTimeout(_timeout);
		}
		return _instance;
	};

	_instance.restart = function() {
		_instance.stop();
		_instance.start();
		return _instance;
	};

	_instance.interval = function(v) {
		if(!arguments.length) { return _interval; }
		_interval = v;
		return _instance;
	};

	_instance.delay = function(v) {
		if(!arguments.length) { return _delay; }
		_delay = v;
		return _instance;
	};

	_instance.fps = function(v) {
		if(!arguments.length) { return _fps; }
		_fps = v;
		if(_running) {
			_instance.restart();
		}
		return _instance;
	};

	return _instance;
}

function verticalBars() {

	// Layout properties
	var _width = 100;
	var _barHeight = 24;
	var _barPadding = 2;
	var _duration = 500;

	// d3 dispatcher for handling events
	var _dispatch = d3.dispatch('mouseover', 'mouseout', 'click');
	var _fn = {
		mouseover: function(d, i) {
			_dispatch.call('mouseover', this, d, i);
		},
		mouseout: function(d, i) {
			_dispatch.call('mouseout', this, d, i);
		},
		click: function(d, i) {
			_dispatch.call('click', this, d, i);
		},
		key: function(d) { return d.key; },
		value: function(d) { return d.value; },
		label: function(d) { return d.key + ' (' + d.value + ')'; }
	};


	// Default scales for x and y dimensions
	var _scale = {
		x: d3.scaleLinear(),
		y: d3.scaleLinear()
	};

	// Extents
	var _extent = {
		width: extent({
			defaultValue: [ 0, 10 ],
			getValue: function(d, i) { return _fn.value(d, i); }
		})
	};

	// elements
	var _element = {
		div: undefined
	};

	var _data = [];

	// Chart create/init method
	function _instance(selection) { }

	/*
	 * Initialize the chart (should only call this once). Performs all initial chart
	 * creation and setup
	 */
	_instance.init = function(container) {
		// Create the DIV element
		_element.div = container.append('div').attr('class', 'sentio bars-vertical');
		_instance.resize();

		return _instance;
	};

	/*
	 * Set the _instance data
	 */
	_instance.data = function(v) {
		if(!arguments.length) { return _data; }
		_data = (null != v)? v : [];

		return _instance;
	};

	/*
	 * Updates all the elements that depend on the size of the various components
	 */
	_instance.resize = function() {
		// Set up the x scale (y is fixed)
		_scale.x.range([ 0, _width ]);

		return _instance;
	};

	/*
	 * Redraw the graphic
	 */
	_instance.redraw = function() {

		// Update the x domain
		_scale.x.domain(_extent.width.getExtent(_data));

		// Update the y domain (based on configuration and data)
		_scale.y.domain([ 0, _data.length ]);
		_scale.y.range([ 0, (_barHeight + _barPadding) * _data.length ]);

		// Data Join
		var bar = _element.div.selectAll('div.bar')
			.data(_data, _fn.key);

		// Update Only

		// Enter
		var barEnter = bar.enter().append('div')
			.attr('class', 'bar')
			.style('top', (_scale.y.range()[1] - _barHeight) + 'px')
			.style('height', _barHeight + 'px')
			.on('mouseover', _fn.mouseover)
			.on('mouseout', _fn.mouseout)
			.on('click', _fn.click)
			.style('opacity', '0.01');

		var barLabel = barEnter.append('div')
			.attr('class', 'bar-label');

		// Enter + Update
		barEnter.merge(bar).transition().duration(_duration)
			.style('opacity', '1')
			.style('width', function(d, i) { return _scale.x(_fn.value(d, i)) + 'px'; })
			.style('top', function(d, i) { return (_scale.y(i)) + 'px'; })
			.style('left', '0px');

		barLabel.merge(bar.select('div.bar-label'))
			.html(_fn.label)
			.style('max-width', (_scale.x.range()[1] - 10) + 'px');

		// Exit
		bar.exit()
			.transition().duration(_duration)
			.style('opacity', '0.01')
			.style('top', (_scale.y.range()[1] - _barHeight) + 'px' )
			.remove();

		// Update the size of the parent div
		_element.div
			.style('height', (_scale.y.range()[1]) + 'px');

		return _instance;
	};


	// Basic Getters/Setters
	_instance.width = function(v) {
		if(!arguments.length) { return _width; }
		_width = v;
		return _instance;
	};
	_instance.barHeight = function(v) {
		if(!arguments.length) { return _barHeight; }
		_barHeight = v;
		return _instance;
	};
	_instance.barPadding = function(v) {
		if(!arguments.length) { return _barPadding; }
		_barPadding = v;
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
	_instance.label = function(v) {
		if(!arguments.length) { return _fn.label; }
		_fn.label = v;
		return _instance;
	};
	_instance.widthExtent = function(v) {
		if(!arguments.length) { return _extent.width; }
		_extent.width = v;
		_extent.width.getValue(function(d, i) { return _fn.value(d, i); });
		return _instance;
	};
	_instance.dispatch = function(v) {
		if(!arguments.length) { return _dispatch; }
		return _instance;
	};
	_instance.duration = function(v) {
		if(!arguments.length) { return _duration; }
		_duration = v;
		return _instance;
	};

	return _instance;
}

var chart = {
	donut: donut,
	matrix: matrix,
	realtimeTimeline: realtimeTimeline,
	timeline: timeline,
	verticalBars: verticalBars
};

function bins(config) {

	/**
	 * Private variables
	 */
	// Configuration
	var _config = {
		// The number of bins in our model
		count: 1,

		// The size of a bin in key value units
		size: undefined,

		// The min and max bins
		lwm: undefined,
		hwm: undefined
	};

	var _fn = {
		// The default function for creating the seed value for a bin
		createSeed: function() { return []; },

		// The default key function
		getKey: function(d) { return d; },

		// The default value function
		getValue: function(d) { return d; },

		// The default function for updating a bin given a new value
		updateBin: function(bin, d) { bin[1].push(d); },

		// The default function for counting the contents of the bins (includes code for backward compatibility)
		countBin: function(bin) {
			// If the bin contains a number, just return it
			if (typeof bin[1] === 'number') {
				return bin[1];
			}
			// If the bin contains an array of data, return the number of items
			if (bin[1].hasOwnProperty('length')) {
				return bin[1].length;
			}
			return 0;
		},

		// The default function to be called after items are added to the bins
		afterAdd: function(bins, currentCount, previousCount) {},

		// The default function to be called after the bins are updated
		afterUpdate: function(bins, currentCount, previousCount) {}
	};

	// The data (an array of object containers)
	var _data = [];

	// A cached total count of all the objects in the bins
	var _dataCount = 0;


	/**
	 * Private Functions
	 */

	// Get the index given the value
	function getIndex(v) {
		if(null == _config.size || null == _config.lwm) {
			return 0;
		}

		return Math.floor((v - _config.lwm)/_config.size);
	}

	function calculateHwm() {
		_config.hwm = _config.lwm + (_config.count * _config.size);
	}

	function updateState() {
		var bin;
		var prevCount = _dataCount;

		// drop stuff below the lwm
		while(_data.length > 0 && _data[0][0] < _config.lwm) {
			bin = _data.shift();
			_dataCount -= _fn.countBin(bin);
		}

		// drop stuff above the hwm
		while(_data.length > 0 && _data[_data.length - 1][0] >= _config.hwm) {
			bin = _data.pop();
			_dataCount -= _fn.countBin(bin);
		}

		// if we emptied the array, add an element for the lwm
		if(_data.length === 0) {
			_data.push([ _config.lwm, _fn.createSeed() ]);
		}

		// fill in any missing values from the lowest bin to the lwm
		for(var i=_data[0][0] - _config.size; i >= _config.lwm; i -= _config.size) {
			_data.unshift([ i, _fn.createSeed() ]);
		}

		// pad above the hwm
		while(_data[_data.length - 1][0] < _config.hwm - _config.size) {
			_data.push([ _data[_data.length-1][0] + _config.size, _fn.createSeed() ]);
		}
		if (_fn.afterUpdate) {
			_fn.afterUpdate.call(model, _data, _dataCount, prevCount);
		}
	}

	function addData(dataToAdd) {
		var prevCount = _dataCount;

		dataToAdd.forEach(function(element, index) {
			var i = getIndex(_fn.getKey(element, index));
			if(i >= 0 && i < _data.length) {
				var value = _fn.getValue(element, index);
				var prevBinCount = _fn.countBin(_data[i]);
				_fn.updateBin.call(model, _data[i], value, index);
				_dataCount += _fn.countBin(_data[i]) - prevBinCount;
			}
		});
		if (_fn.afterAdd) {
			_fn.afterAdd.call(model, _data, _dataCount, prevCount);
		}
	}

	function clearData() {
		_data.length = 0;
		_dataCount = 0;
	}


	/*
	 * Constructor/initialization method
	 */
	function model(binConfig) {
		if(null == binConfig || null == binConfig.size || null == binConfig.count || null == binConfig.lwm) {
			throw new Error('You must provide an initial size, count, and lwm');
		}
		_config.size = Number(binConfig.size);
		_config.count = Number(binConfig.count);
		_config.lwm = Number(binConfig.lwm);

		if(null != binConfig.createSeed) { _fn.createSeed = binConfig.createSeed; }
		if(null != binConfig.getKey) { _fn.getKey = binConfig.getKey; }
		if(null != binConfig.getValue) { _fn.getValue = binConfig.getValue; }
		if(null != binConfig.updateBin) { _fn.updateBin = binConfig.updateBin; }
		if(null != binConfig.countBin) { _fn.countBin = binConfig.countBin; }
		if(null != binConfig.afterAdd) { _fn.afterAdd = binConfig.afterAdd; }
		if(null != binConfig.afterUpdate) { _fn.afterUpdate = binConfig.afterUpdate; }

		calculateHwm();
		updateState();
	}


	/**
	 * Public API
	 */

	/**
	 * Resets the model with the new data
	 */
	model.set = function(data) {
		clearData();
		updateState();
		addData(data);
		return model;
	};

	/**
	 * Clears the data currently in the bin model
	 */
	model.clear = function() {
		clearData();
		updateState();
		return model;
	};

	/**
	 * Add an array of data objects to the bins
	 */
	model.add = function(dataToAdd) {
		addData(dataToAdd);
		return model;
	};

	/**
	 * Get/Set the low water mark value
	 */
	model.lwm = function(v) {
		if(!arguments.length) { return _config.lwm; }

		var oldLwm = _config.lwm;
		_config.lwm = Number(v);

		calculateHwm();

		if((oldLwm - _config.lwm) % _config.size !== 0) {
			// the difference between watermarks is not a multiple of the bin size, so we need to reset
			clearData();
		}

		updateState();

		return model;
	};

	/**
	 * Get the high water mark
	 */
	model.hwm = function() {
		return _config.hwm;
	};

	/**
	 * Get/Set the key function used to determine the key value for indexing into the bins
	 */
	model.getKey = function(v) {
		if(!arguments.length) { return _fn.getKey; }
		_fn.getKey = v;

		clearData();
		updateState();

		return model;
	};

	/**
	 * Get/Set the value function for determining what value is added to the bin
	 */
	model.getValue = function(v) {
		if(!arguments.length) { return _fn.getValue; }
		_fn.getValue = v;

		clearData();
		updateState();

		return model;
	};

	/**
	 * Get/Set the Update bin function for determining how to update the state of a bin when a new value is added to it
	 */
	model.updateBin = function(v) {
		if(!arguments.length) { return _fn.updateBin; }
		_fn.updateBin = v;

		clearData();
		updateState();

		return model;
	};

	/**
	 * Get/Set the seed function for populating
	 */
	model.createSeed = function(v) {
		if(!arguments.length) { return _fn.createSeed; }
		_fn.createSeed = v;

		clearData();
		updateState();

		return model;
	};

	/**
	 * Get/Set the countBin function for populating
	 */
	model.countBin = function(v) {
		if(!arguments.length) { return _fn.countBin; }
		_fn.countBin = v;

		clearData();
		updateState();

		return model;
	};

	/**
	 * Get/Set the afterAdd callback function
	 */
	model.afterAdd = function(v) {
		if(!arguments.length) { return _fn.afterAdd; }
		_fn.afterAdd = v;
		return model;
	};

	/**
	 * Get/Set the afterUpdate callback function
	 */
	model.afterUpdate = function(v) {
		if(!arguments.length) { return _fn.afterUpdate; }
		_fn.afterUpdate = v;
		return model;
	};

	/**
	 * Get/Set the bin size configuration
	 */
	model.size = function(v) {
		if(!arguments.length) { return _config.size; }

		v = Number(v);
		if(v < 1) {
			throw new Error('Bin size must be a positive integer');
		}

		// Only change stuff if the size actually changes
		if(v !== _config.size) {
			_config.size = v;
			calculateHwm();
			clearData();
			updateState();
		}

		return model;
	};

	/**
	 * Get/Set the bin count configuration
	 */
	model.count = function(v) {
		if(!arguments.length) { return _config.count; }

		v = Number(v);
		if(v < 1) {
			throw new Error('Bin count must be a positive integer');
		}

		// Only change stuff if the count actually changes
		if(v !== _config.count) {
			_config.count = Math.floor(v);
			calculateHwm();
			updateState();
		}

		return model;
	};

	/**
	 * Accessor for the bins of data
	 * @returns {Array} Returns the complete array of bins
	 */
	model.bins = function() {
		return _data;
	};

	/**
	 * Accessor for the cached count of all the data in the bins, calculated for each bin by the countBin() function
	 * @returns {number} The count of data in the bins
	 */
	model.itemCount = function() {
		return _dataCount;
	};

	/**
	 * Clears all the data in the bin with the given index
	 * @param {number} i The index into the bins array of the bin to clear
	 * @returns {number} The number of items in the bin that was cleared, as returned by countBin() function
	 */
	model.clearBin = function(i) {
		if (i >= 0 && i < _data.length) {
			var count = _fn.countBin(_data[i]);
			_dataCount -= count;
			_data[i][1] = _fn.createSeed();
			return count;
		}
		return 0;
	};

	// Initialize the model
	model(config);

	return model;
}

/*
 * Controller wrapper for the bin model. Assumes binSize is in milliseconds.
 * Every time binSize elapses, updates the lwm to keep the bins shifting.
 */
function realtimeBins(config) {

	/**
	 * Private variables
	 */
	var _config = {
		delay: 0,
		binSize: 0,
		binCount: 0
	};

	// The bins
	var _model;
	var _running;

	/**
	 * Private Functions
	 */

	function _calculateLwm() {
		// Assume the hwm is now plus two binSize
		var hwm = Date.now() + 2*_model.size();

		// Trunc the hwm down to a round value based on the binSize
		hwm = Math.floor(hwm/_model.size()) * _model.size();

		// Derive the lwm from the hwm
		var lwm = hwm - _model.size() * _model.count();

		return lwm;
	}

	function _update() {
		if(_running === true) {
			// need to update the lwm
			_model.lwm(_calculateLwm());
			window.setTimeout(_update, _model.size());
		}
	}

	function _start() {
		if(!_running) {
			// Start the update loop
			_running = true;
			_update();
		}
	}

	function _stop() {
		// Setting running to false will stop the update loop
		_running = false;
	}

	// create/init method
	function controller(rtConfig) {
		if(null == rtConfig || null == rtConfig.binCount || null == rtConfig.binSize) {
			throw new Error('You must provide an initial binSize and binCount');
		}

		_config.binSize = Number(rtConfig.binSize);
		_config.binCount = Number(rtConfig.binCount);

		if(null != rtConfig.delay) {
			_config.delay = Number(rtConfig.delay);
		}

		_model = bins({
			size: _config.binSize,
			count: _config.binCount + 2,
			lwm: 0
		});
		_model.lwm(_calculateLwm());

		_start();
	}



	/**
	 * Public API
	 */

	/*
	 * Get the model bins
	 */
	controller.model = function() {
		return _model;
	};

	controller.bins = function() {
		return _model.bins();
	};

	controller.start = function() {
		_start();
		return controller;
	};

	controller.stop = function() {
		_stop();
		return controller;
	};

	controller.running = function() {
		return _running;
	};

	controller.add = function(v) {
		_model.add(v);
		return controller;
	};

	controller.clear = function() {
		_model.clear();
		return controller;
	};

	controller.binSize = function(v) {
		if(!arguments.length) { return _config.binSize; }

		v = Number(v);
		if(v < 1) {
			throw new Error('Bin size must be a positive integer');
		}

		_config.binSize = v;
		_model.size(v);
		_model.lwm(_calculateLwm());

		return controller;
	};

	controller.binCount = function(v) {
		if(!arguments.length) { return _config.binCount; }

		v = Number(v);
		if(v < 1) {
			throw new Error('Bin count must be a positive integer');
		}

		_config.binCount = v;
		_model.count(v + 2);
		_model.lwm(_calculateLwm());

		return controller;
	};

	// Initialize the layout
	controller(config);

	return controller;
}

var controller = {
	realtimeBins: realtimeBins,
	timelineBrush: timelineBrush
};

var model = {
	bins: bins,
	extent: extent,
	multiExtent: multiExtent
};

exports.chart = chart;
exports.controller = controller;
exports.model = model;

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=sentio.js.map
