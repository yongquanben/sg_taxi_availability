describe('Bin Layout', function() {
	'use strict';

	before(function() {
	});

	// Basic Usage of layout
	describe('Creation', function() {

		context('when complete', function() {
			it('should not throw an error', function() {
				(function() {
					sentio.model.bins({
						count: 10,
						size: 1,
						lwm: 0
					});
				}).should.not.throw();
			});

			it('should have the right initial structure', function() {
				var layout = sentio.model.bins({
					count: 3,
					size: 2,
					lwm: 1
				});

				var bins = layout.bins();

				bins.length.should.equal(3);

				bins[0][0].should.equal(1);
				bins[0][1].length.should.equal(0);
				bins[1][0].should.equal(3);
				bins[1][1].length.should.equal(0);
				bins[2][0].should.equal(5);
				bins[2][1].length.should.equal(0);
			});

		});

		context('when incomplete', function() {
			it('should throw an error', function() {
				(function() {
					sentio.model.bins({
						size: 1,
						lwm: 0
					});
				}).should.throw();
			});
		});

	});

	describe('Adding Data', function() {
		context('when adding data within bounds', function() {
			var layout = sentio.model.bins({
				count: 5,
				size: 10,
				lwm: 30
			});

			it('should all get added', function() {
				layout.add([ 30, 31, 40, 50, 55, 70, 35 ]);
				var bins = layout.bins();

				bins.length.should.equal(5);

				bins[0][0].should.equal(30);
				bins[0][1].length.should.equal(3);
				bins[1][0].should.equal(40);
				bins[1][1].length.should.equal(1);
				bins[2][0].should.equal(50);
				bins[2][1].length.should.equal(2);
				bins[3][0].should.equal(60);
				bins[3][1].length.should.equal(0);
				bins[4][0].should.equal(70);
				bins[4][1].length.should.equal(1);

				var itemCount = layout.itemCount();
				itemCount.should.equal(7);
			});
		});

		context('when adding data out of bounds', function() {
			it('should not get added', function() {
				var layout = sentio.model.bins({
					count: 5,
					size: 10,
					lwm: 30
				});

				layout.add([ 29, 0, -1, 100, 51, 55, 10 ]);
				var bins = layout.bins();

				bins.length.should.equal(5);

				bins[0][0].should.equal(30);
				bins[0][1].length.should.equal(0);
				bins[1][0].should.equal(40);
				bins[1][1].length.should.equal(0);
				bins[2][0].should.equal(50);
				bins[2][1].length.should.equal(2);
				bins[3][0].should.equal(60);
				bins[3][1].length.should.equal(0);
				bins[4][0].should.equal(70);
				bins[4][1].length.should.equal(0);

				var itemCount = layout.itemCount();
				itemCount.should.equal(2);
			});
		});

	});

	describe('Modifying LWM', function() {
		context('when increasing the lwm', function() {
			var layout = sentio.model.bins({
				count: 5,
				size: 10,
				lwm: 0
			});

			layout.add([ 0, 1, 2, 10, 15, 16, 17, 24, 35, 59, 60 ]);
			layout.lwm(20);
			var bins = layout.bins();

			it('should maintain the right number of bins', function() {
				bins.length.should.equal(5);
			});

			it('should drop out of bounds data', function() {
				bins[0][0].should.equal(20);
				bins[0][1].length.should.equal(1);
				bins[1][0].should.equal(30);
				bins[1][1].length.should.equal(1);
				bins[2][0].should.equal(40);
				bins[2][1].length.should.equal(0);
			});

			it('should allocate new bins initialized as empty', function() {
				bins[3][0].should.equal(50);
				bins[3][1].length.should.equal(0);
				bins[4][0].should.equal(60);
				bins[4][1].length.should.equal(0);
			});

			it('should recalculate item counts', function() {
				layout.itemCount().should.equal(2);
			});
		});

		context('when decreasing the lwm', function() {
			var layout = sentio.model.bins({
				count: 5,
				size: 10,
				lwm: 0
			});

			layout.add([ 0, 1, 2, 10, 15, 16, 17, 24, 35, 59, 60 ]);
			layout.lwm(-20);
			var bins = layout.bins();

			it('should maintain the right number of bins', function() {
				bins.length.should.equal(5);
			});

			it('should drop out of bounds data and allocate new bins initialized as empty', function() {
				bins[0][0].should.equal(-20);
				bins[0][1].length.should.equal(0);
				bins[1][0].should.equal(-10);
				bins[1][1].length.should.equal(0);
				bins[2][0].should.equal(0);
				bins[2][1].length.should.equal(3);
				bins[3][0].should.equal(10);
				bins[3][1].length.should.equal(4);
				bins[4][0].should.equal(20);
				bins[4][1].length.should.equal(1);
			});

			it('should recalculate item counts', function() {
				layout.itemCount().should.equal(8);
			});
		});

		context('when not changing the lwm', function() {
			var layout = sentio.model.bins({
				count: 5,
				size: 10,
				lwm: 0
			});

			layout.add([ 0, 1, 2, 10, 15, 16, 17, 24, 35, 59, 60 ]);
			layout.lwm(0);
			var bins = layout.bins();

			it('should maintain the right number of bins', function() {
				bins.length.should.equal(5);
			});

			it('should not change anything', function() {
				bins[0][0].should.equal(0);
				bins[0][1].length.should.equal(3);
				bins[1][0].should.equal(10);
				bins[1][1].length.should.equal(4);
				bins[2][0].should.equal(20);
				bins[2][1].length.should.equal(1);
				bins[3][0].should.equal(30);
				bins[3][1].length.should.equal(1);
				bins[4][0].should.equal(40);
				bins[4][1].length.should.equal(0);
			});

			it('should maintain the item counts', function() {
				layout.itemCount().should.equal(9);
			});
		});

		context('when setting the lwm such that a reset is necessary', function() {
			var layout = sentio.model.bins({
				count: 5,
				size: 10,
				lwm: 0
			});

			layout.add([ 0, 1, 2, 10, 15, 16, 17, 24, 35, 59, 60, 75 ]);
			layout.lwm(15);
			var bins = layout.bins();

			it('should maintain the right number of bins', function() {
				bins.length.should.equal(5);
			});

			it('should clear the data', function() {
				bins[0][0].should.equal(15);
				bins[0][1].length.should.equal(0);
				bins[1][0].should.equal(25);
				bins[1][1].length.should.equal(0);
				bins[2][0].should.equal(35);
				bins[2][1].length.should.equal(0);
				bins[3][0].should.equal(45);
				bins[3][1].length.should.equal(0);
				bins[4][0].should.equal(55);
				bins[4][1].length.should.equal(0);
			});

			it('should clear item counts', function() {
				layout.itemCount().should.equal(0);
			});
		});
	});

	describe('Modifying Bin Count', function() {
		context('when increasing the bin count', function() {
			var layout = sentio.model.bins({
				count: 5,
				size: 10,
				lwm: 0
			});

			layout.count(10);
			var bins = layout.bins();

			it('should increase the number of bins', function() {
				bins.length.should.equal(10);
			});
		});

		context('when decreasing the bin count', function() {
			var layout = sentio.model.bins({
				count: 10,
				size: 10,
				lwm: 0
			});

			layout.count(1);
			var bins = layout.bins();

			it('should decrease the number of bins', function() {
				bins.length.should.equal(1);
			});

		});

		context('when not changing the bin count', function() {
			var layout = sentio.model.bins({
				count: 5,
				size: 10,
				lwm: 0
			});

			layout.count(5);
			var bins = layout.bins();

			it('should not change the number of bins', function() {
				bins.length.should.equal(5);
			});

		});

		context('when sending an invalid value', function() {
			var layout = sentio.model.bins({
				count: 5,
				size: 10,
				lwm: 0
			});

			it('should throw an error', function() {
				(function() {
					layout.count(-1);
				}).should.throw();
			});

			it('should not modify the bin count', function() {
				layout.count(5);
			});

		});
	});

	describe('Modifying Bin Size', function() {
		context('when increasing the bin size', function() {
			var layout = sentio.model.bins({
				count: 3,
				size: 1,
				lwm: 0
			});

			layout.add([ 0, 1, 2, 0, 1 ]);
			layout.size(3);
			var bins = layout.bins();

			it('should keep the same number of bins', function() {
				bins.length.should.equal(3);
			});

			it('should keep the same lwm', function() {
				layout.lwm().should.equal(0);
			});

			it('should clear the data', function() {
				bins[0][0].should.equal(0);
				bins[0][1].length.should.equal(0);
				bins[1][0].should.equal(3);
				bins[1][1].length.should.equal(0);
				bins[2][0].should.equal(6);
				bins[2][1].length.should.equal(0);
			});
		});

		context('when decreasing the bin size', function() {
			var layout = sentio.model.bins({
				count: 3,
				size: 10,
				lwm: 0
			});

			layout.add([ 0, 1, 2, 15, 19 ]);
			layout.size(3);
			var bins = layout.bins();

			it('should keep the same number of bins', function() {
				bins.length.should.equal(3);
			});

			it('should keep the same lwm', function() {
				layout.lwm().should.equal(0);
			});

			it('should clear the data', function() {
				bins[0][0].should.equal(0);
				bins[0][1].length.should.equal(0);
				bins[1][0].should.equal(3);
				bins[1][1].length.should.equal(0);
				bins[2][0].should.equal(6);
				bins[2][1].length.should.equal(0);

				layout.itemCount().should.equal(0);
			});
		});

		context('when not changing the bin size', function() {
			var layout = sentio.model.bins({
				count: 3,
				size: 1,
				lwm: 0
			});

			layout.add([ 0, 1, 2, 1, 0 ]);
			layout.size(1);
			var bins = layout.bins();

			it('should not change the number of bins', function() {
				bins.length.should.equal(3);
			});

			it('should not impact the data', function() {
				bins[0][0].should.equal(0);
				bins[0][1].length.should.equal(2);
				bins[1][0].should.equal(1);
				bins[1][1].length.should.equal(2);
				bins[2][0].should.equal(2);
				bins[2][1].length.should.equal(1);
			});

		});

		context('when sending an invalid value', function() {
			var layout = sentio.model.bins({
				count: 5,
				size: 10,
				lwm: 0
			});

			it('should throw an error', function() {
				(function() {
					layout.size(-1);
				}).should.throw();
			});

			it('should not modify the bin size', function() {
				layout.size().should.equal(10);
			});

		});
	});

	describe('Custom bin aggregation', function() {

		context('when summing values', function() {
			var layout = sentio.model.bins({
				count: 3,
				size: 10,
				lwm: 0
			});

			layout
				.getKey(function(d) { return d.key; })
				.getValue(function(d) { return d.value; })
				.updateBin(function(bin, d) { bin[1] += d; })
				.createSeed(function() { return 0; });

			layout.add([ {key: 3, value: 2}, {key: 4, value:5}, {key:20, value:4} ]);

			it('should aggregate properly', function() {
				var bins = layout.bins();
				bins.length.should.equal(3);
				bins[0][1].should.equal(7);
				bins[1][1].should.equal(0);
				bins[2][1].should.equal(4);
			});

			it('should count items properly', function() {
				layout.itemCount().should.equal(11);
			});

			it('should empty on reset', function() {
				layout.size(10);
			});

		});
	});

	describe('Clearing the model', function() {

		context('when the model is binning values', function() {
			var layout = sentio.model.bins({
				count: 3,
				size: 1,
				lwm: 0
			});

			layout.add([ 0, 1, 2, 3 ]);

			it('should result in empty arrays', function() {
				var bins = layout.bins();

				bins[0][1].length.should.equal(1);
				bins[1][1].length.should.equal(1);
				bins[2][1].length.should.equal(1);
				layout.itemCount().should.equal(3);

				layout.clear();

				bins.length.should.equal(3);
				bins[0][1].length.should.equal(0);
				bins[1][1].length.should.equal(0);
				bins[2][1].length.should.equal(0);
				layout.itemCount().should.equal(0);
			});

		});

		context('when the model is summing values', function() {
			var layout = sentio.model.bins({
				count: 3,
				size: 1,
				lwm: 0
			});

			layout
				.updateBin(function(bin, d) { bin[1] += 1; })
				.createSeed(function() { return 0; });

			layout.add([ 0, 1, 2, 3 ]);

			it('should result in 0 values', function() {
				var bins = layout.bins();

				bins[0][1].should.equal(1);
				bins[1][1].should.equal(1);
				bins[2][1].should.equal(1);
				layout.itemCount().should.equal(3);

				layout.clear();

				bins.length.should.equal(3);
				bins[0][1].should.equal(0);
				bins[1][1].should.equal(0);
				bins[2][1].should.equal(0);
				layout.itemCount().should.equal(0);
			});
		});
	});

	describe('Limiting the model', function() {

		context('when the model is binning values', function() {
			var layout = sentio.model.bins({
				count: 3,
				size: 3,
				lwm: 0,
				afterAdd: function(bins, currentCount, previousCount) {
					// If we've exceeded the threshold, dump the lowest bin
					if (currentCount > 6) {
						this.clearBin(0);
					}
				}
			});

			it ('should start with max items', function() {
				layout.add([ 0, 1, 2, 3, 4, 5 ]);

				var bins = layout.bins();
				bins[0][1].length.should.equal(3);
				bins[1][1].length.should.equal(3);
				bins[2][1].length.should.equal(0);
				layout.itemCount().should.equal(6);
			});

			it('should limit next addition', function() {
				layout.add([ 6 ]);

				var bins = layout.bins();
				bins[0][1].length.should.equal(0);
				bins[1][1].length.should.equal(3);
				bins[2][1].length.should.equal(1);
				layout.itemCount().should.equal(4);
			});

			it('should not limit next 2 additions', function() {
				layout.add([ 1, 7 ]);

				var bins = layout.bins();
				bins[0][1].length.should.equal(1);
				bins[1][1].length.should.equal(3);
				bins[2][1].length.should.equal(2);
				layout.itemCount().should.equal(6);
			});
		});

		context('when the model is summing values', function() {
			var layout = sentio.model.bins({
				count: 3,
				size: 3,
				lwm: 0
			});

			layout
				.updateBin(function(bin, d) { bin[1] += 1; })
				.createSeed(function() { return 0; })
				.afterAdd(function(bins, currentCount, previousCount) {
					// If we've exceeded the threshold, dump the lowest bin
					if (currentCount > 6) {
						this.clearBin(0);
					}
				});

			it ('should start with max items', function() {
				layout.add([ 0, 1, 2, 3, 4, 5 ]);

				var bins = layout.bins();
				bins[0][1].should.equal(3);
				bins[1][1].should.equal(3);
				bins[2][1].should.equal(0);
				layout.itemCount().should.equal(6);
			});

			it('should limit next addition', function() {
				layout.add([ 6 ]);

				var bins = layout.bins();
				bins[0][1].should.equal(0);
				bins[1][1].should.equal(3);
				bins[2][1].should.equal(1);
				layout.itemCount().should.equal(4);
			});

			it('should not limit next 2 additions', function() {
				layout.add([ 1, 7 ]);

				var bins = layout.bins();
				bins[0][1].should.equal(1);
				bins[1][1].should.equal(3);
				bins[2][1].should.equal(2);
				layout.itemCount().should.equal(6);
			});
		});
	});
});
