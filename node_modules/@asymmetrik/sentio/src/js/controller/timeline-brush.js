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

export { timelineBrush };
