describe('Multi Extent', function() {
	'use strict';

	before(function() {
	});

	// Basic Usage of extent
	describe('Creation', function() {

		context('when complete', function() {
			it('should not throw an error when there is no configured extent', function() {
				(function() {
					sentio.model.multiExtent();
				}).should.not.throw();
			});

			it('should not throw an error when configuring', function() {
				(function() {
					sentio.model.multiExtent({
						extent: sentio.model.extent()
					});
				}).should.not.throw();
			});

		});

	});

	describe('Usage', function() {
		context('when configured correctly', function() {
			var extentController = sentio.model.multiExtent({
				extent: sentio.model.extent({
					defaultValue: [ 0, 1 ]
				})
			});

			it('should return the default value if passed empty data', function() {
				var extent = extentController.getExtent([]);
				extent.length.should.equal(2);
				extent[0].should.equal(0);
				extent[1].should.equal(1);
			});

			it('should return the extent if passed actual data', function() {
				var extent = extentController.getExtent([ { values: [ 0, 1 ] }, { values: [ -5, 11 ] }, { values: [ 4, 17 ] } ]);
				extent.length.should.equal(2);
				extent[0].should.equal(-5);
				extent[1].should.equal(17);

				extent = extentController.getExtent([ { values: [] }, { values: [] } ]);
				extent.length.should.equal(2);
				extent[0].should.equal(0);
				extent[1].should.equal(1);

				extent = extentController.getExtent([]);
				extent.length.should.equal(2);
				extent[0].should.equal(0);
				extent[1].should.equal(1);
			});
		});

		context('when configured with a custom values accessor', function() {
			var extentController = sentio.model.multiExtent({
				extent: sentio.model.extent({
					defaultValue: [ 0, 1 ]
				})
			}).values(function(d) { return d; } );

			it('should return the override value if passed empty data', function() {
				var extent = extentController.getExtent([]);
				extent.length.should.equal(2);
				extent[0].should.equal(0);
				extent[1].should.equal(1);
			});

			it('should return the extent if passed actual data', function() {
				var extent = extentController.getExtent([ [ 3 ], [ 4, 5 ], [ 6, 7 ] ]);
				extent.length.should.equal(2);
				extent[0].should.equal(3);
				extent[1].should.equal(7);

				extent = extentController.getExtent([ [ 3 ], [], [ 0, -1 ] ]);
				extent.length.should.equal(2);
				extent[0].should.equal(-1);
				extent[1].should.equal(3);
			});

		});

	});
});
