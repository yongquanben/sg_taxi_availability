describe('Extent', function() {
	'use strict';

	before(function() {
	});

	// Basic Usage of extent
	describe('Creation', function() {

		context('when complete', function() {
			it('should not throw an error when using defaults', function() {
				(function() {
					sentio.model.extent({});
				}).should.not.throw();
			});

			it('should not throw an error when configuring', function() {
				(function() {
					sentio.model.extent({
						defaultValue: [ 0, 1 ],
						overrideValue: [ 0, 10 ],
						getValue: function(d) { return 0; },
						filter: function(d) { return true; }
					});
				}).should.not.throw();
			});

		});

		context('when incorrectly configured', function() {
			it('should throw an error', function() {
				(function() {
					sentio.model.extent({
						defaultValue: []
					});
				}).should.throw();
			});
		});

	});

	describe('Usage', function() {
		context('when configured with a default value', function() {
			var extentController = sentio.model.extent({
				defaultValue: [ 0, 1 ]
			});

			it('should return the default value if passed empty data', function() {
				var extent = extentController.getExtent([]);
				extent.length.should.equal(2);
				extent[0].should.equal(0);
				extent[1].should.equal(1);
			});

			it('should return the extent if passed actual data', function() {
				var extent = extentController.getExtent([ 0, 1, 2, 3, 4, 5, 6, 7 ]);
				extent.length.should.equal(2);
				extent[0].should.equal(0);
				extent[1].should.equal(7);

				extent = extentController.getExtent([ -10, 10, 2, 3, 7, 1 ]);
				extent.length.should.equal(2);
				extent[0].should.equal(-10);
				extent[1].should.equal(10);

				extent = extentController.getExtent([ 1 ]);
				extent.length.should.equal(2);
				extent[0].should.equal(1);
				extent[1].should.equal(1);
			});
		});

		context('when configured with a override value', function() {
			var extentController = sentio.model.extent({
				overrideValue: [ 0, 1 ]
			});

			it('should return the override value if passed empty data', function() {
				var extent = extentController.getExtent([]);
				extent.length.should.equal(2);
				extent[0].should.equal(0);
				extent[1].should.equal(1);
			});

			it('should return the extent if passed actual data', function() {
				var extent = extentController.getExtent([ 0, 1, 2, 3, 4, 5, 6, 7 ]);
				extent.length.should.equal(2);
				extent[0].should.equal(0);
				extent[1].should.equal(1);

				extent = extentController.getExtent([ -10, 10, 2, 3, 7, 1 ]);
				extent.length.should.equal(2);
				extent[0].should.equal(0);
				extent[1].should.equal(1);

				extent = extentController.getExtent([ 1 ]);
				extent.length.should.equal(2);
				extent[0].should.equal(0);
				extent[1].should.equal(1);
			});

			it('should return the extent if passed only one value', function() {
				var extent = extentController.getExtent([ 0 ]);
				extent.length.should.equal(2);
				extent[0].should.equal(0);
				extent[1].should.equal(1);

				extent = extentController.getExtent([ 0, 0, 0 ]);
				extent.length.should.equal(2);
				extent[0].should.equal(0);
				extent[1].should.equal(1);

			});
		});

		context('when configured with a partial override value', function() {
			var extentController = sentio.model.extent({
				overrideValue: [ 0, undefined ]
			});

			it('should return the default value combined with the override value if passed empty data', function() {
				var extent = extentController.getExtent([]);
				extent.length.should.equal(2);
				extent[0].should.equal(0);
				extent[1].should.equal(extentController.defaultValue()[1]);
			});

			it('should return the extent if passed actual data', function() {
				var extent = extentController.getExtent([ 0, 1, 2, 3, 4, 5, 6, 7 ]);
				extent.length.should.equal(2);
				extent[0].should.equal(0);
				extent[1].should.equal(7);

				extent = extentController.getExtent([ -10, 10, 2, 3, 7, 1 ]);
				extent.length.should.equal(2);
				extent[0].should.equal(0);
				extent[1].should.equal(10);

				extent = extentController.getExtent([ 1 ]);
				extent.length.should.equal(2);
				extent[0].should.equal(0);
				extent[1].should.equal(1);
			});

			it('should return the extent if passed only one value', function() {
				var extent = extentController.getExtent([ 0 ]);
				extent.length.should.equal(2);
				extent[0].should.equal(0);
				extent[1].should.equal(0);

				extent = extentController.getExtent([ 0, 0, 0 ]);
				extent.length.should.equal(2);
				extent[0].should.equal(0);
				extent[1].should.equal(0);

			});
		});
	});
});
