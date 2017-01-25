describe('Realtime Bins Controller', function() {
	'use strict';

	before(function() {
	});

	// Basic Usage of controller
	describe('Creation', function() {

		context('when complete', function() {
			var controller;

			it('should not throw an error', function() {
				(function() {
					controller = sentio.controller.realtimeBins({
						binCount: 10,
						binSize: 1
					});
				}).should.not.throw();
			});

			it('should have the right initial structure', function() {
				var bins = controller.bins();

				// The rtTimeline adds two buffer bins to the top of the model
				bins.length.should.equal(12);
			});

		});

		context('when incomplete', function() {
			it('should throw an error', function() {
				(function() {
					sentio.controller.realtimeBins();
				}).should.throw();

				(function() {
					sentio.controller.realtimeBins({});
				}).should.throw();
			});
		});

	});

});
