import { extent } from '../model/extent';

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

export { verticalBars };
