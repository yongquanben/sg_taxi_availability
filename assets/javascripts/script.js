$(function() {
  fetchTaxiDataLast100Minutes = function(current_datetime) {
    var url = apiUrl + '?date_time=' + current_datetime.format('YYYY-MM-DDTHH:mm:ss');
    $.ajax({
      url: url,
      beforeSend: function(xhr) {
           xhr.setRequestHeader("api-key", apiKey)
      }, 
      success: function(data) {
        if (data.features != null) {
          // store in hash with timestamp as key, for easy retrieval
          taxiCoordinatesHash[data.features[0].properties.timestamp] = data.features[0].geometry.coordinates;
          taxiAvailabilityCountHash[data.features[0].properties.timestamp] = data.features[0].properties.taxi_count;
          dataSetCount++;
        }
        fireCount++;
      }
    })
    .done(function(data) {
      if (fireCount == initiateFetchCount) {
        currentIndexPointer = dataSetCount - 1;
        // sort by chronological order
        taxiCoordinates = Object.keys(taxiCoordinatesHash).sort().map(function(k) { return taxiCoordinatesHash[k] });
        taxiAvailabilityCount = Object.keys(taxiAvailabilityCountHash).sort().map(function(k) { return taxiAvailabilityCountHash[k] });
        // free up resources
        taxiAvailabilityCountHash = {};
        taxiCoordinatesHash = {};

        hexLayer.data(taxiCoordinates[currentIndexPointer]);
        plotLast100MinutesChart.call(last100MinutesChartSvg, { 
          datetimeData: taxiAvailabilityDateTime, 
          taxiAvailabilityCountData: taxiAvailabilityCount,
          taxiCoordinatesData: taxiCoordinates
        });
        
        // take 1 step at a time, setup last 2 weeks after 100 minutes statistics is completed
        setupLast14DaysStatistics.call(weeklyStatisticsChartSvg);
      }
    });
  }

  fetchTaxiDataLast14Days = function(current_datetime) {
    var url = apiUrl + '?date_time=' + current_datetime.format('YYYY-MM-DDTHH:mm:ss');
    $.ajax({
      url: url,
      beforeSend: function(xhr) {
           xhr.setRequestHeader("api-key", apiKey)
      }, 
      success: function(data) {
        if (data.features != null) {
          var dateTime = moment(data.features[0].properties.timestamp).add(1, 'hour').startOf('hour');
          var dateTimeHourly = dateTime.format('D MMM YYYY hA');
          last14DaysHourlyTaxiAvailabilityCountHash[dateTimeHourly] = data.features[0].properties.taxi_count;

          var hourly = dateTime.format('hA');
          if (hourlyTaxiAvailabilityCountHash[hourly] == null) { hourlyTaxiAvailabilityCountHash[hourly] = []; }
          hourlyTaxiAvailabilityCountHash[hourly].push(data.features[0].properties.taxi_count);
        }
        hourlyFireCount++;
      }
    })
    .done(function(data) {
      if (hourlyFireCount == hourlyInitiateFetchCount) {
        plotLast14daysChart.call(weeklyStatisticsChartSvg, {
          last14DaysHourlyTaxiAvailabilityCountData: last14DaysHourlyTaxiAvailabilityCountHash,
          hourlyTaxiAvailabilityCountData: hourlyTaxiAvailabilityCountHash
        });
      }
    });
  }
  
  plotLast100MinutesChart = function(params) {
    var margin = {top: 150, right: 20, bottom: 50, left: 0}
    var width = this.attr("width") - margin.left - margin.right;
    var height = this.attr("height") - margin.top - margin.bottom;
    var g = this.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var yLast100Minute = d3.scaleLinear()
      .domain([0, Math.max.apply(Math, params.taxiAvailabilityCountData)])
      .range([height, 0]);

    var colorScale = d3.scaleLinear()
      .domain([0, Math.max.apply(Math, params.taxiAvailabilityCountData)])
      .range(['#333', '#F4D03F']);
    
    // bars
    g.selectAll('.taxi-availability-bar')
      .data(params.taxiAvailabilityCountData)
      .enter()
      .append('rect')
      .classed('taxi-availability-bar', true)
      .attr('x', function(d, i) { return ((12 + 3) * i)+50; })
      .attr('rx', 2)
      .attr('ry', 2)
      .attr('y', yLast100Minute(0))
      .attr("width", 12)
      .attr('opacity', 0.8)
      .on("click", function(d, i) {
        goToLast100MinutesChartBar(i, params.datetimeData, params.taxiAvailabilityCountData, params.taxiCoordinatesData);
      })
      .transition()
      .delay(function(d,i){ return 50*i; })
      .duration(function(d,i){ return 150; })
      .attr('y', function(d, i) { return yLast100Minute(d); })
      .attr('height', function(d, i) { return height - yLast100Minute(d); })
      .style('fill', function(d) { return colorScale(d); })
      .ease(d3.easeLinear)

    last100MinutesChartPointerG = this.append('g')
      .classed('availability-chart-pointer', true)

    last100MinutesChartPointerG
      .append('polygon')
      .attr('fill', 'white')
      .attr('stroke-width', 0)
      .attr('points', "03,09 09,03 15,09")

    last100MinutesChartPointerG
      .attr('opacity', 0)
      .attr("transform", "translate(" + ((15 * (params.taxiAvailabilityCountData.length - 1)) + 47) + "," + (height + 150) + ")")
      .transition()
      .attr('opacity', 0.8)
      .delay(50*(params.taxiAvailabilityCountData.length - 1))
      .duration(150);

    this.append('text')
      .classed('displayed-availability-title', true)
      .attr('x', 50)
      .attr('y', 50)
      .text('Taxi Availability');

    this.append('text')
      .classed('displayed-availability-datetime', true)
      .attr('x', 50)
      .attr('y', 81)
      .text(params.datetimeData[params.datetimeData.length - 1].format('D MMM YYYY H:mmA'));

    this.append('text')
      .classed('displayed-availability-count', true)
      .attr('x', 50)
      .attr('y', 123)
      .text(params.taxiAvailabilityCountData[params.taxiAvailabilityCountData.length - 1]);

    this.append('text')
      .classed('displayed-availability-count-object', true)
      .attr('x', 150)
      .attr('y', 123)
      .text("Taxis");
  }

  // setting up of statistics for past 2 weeks
  // called after first last 100 minutes statistics setup is completed
  setupLast14DaysStatistics = function() {
    // ensure that data is drawn based on hourly interval for the last 2 weeks
    var now = Date.now();
    for (i=(hourlyInitiateFetchCount-1); i >= 0; i--) {
      // start of hour + 5 minutes subtraction to avoid missing out on empty API callback
      var dateTime = moment(now).startOf('hour');
      dateTime.subtract(i * 1, 'hour').subtract(5, 'minutes');

      hourlyTaxiAvailabilityDateTime.push(dateTime);
      fetchTaxiDataLast14Days(dateTime);
    }
    
    this.append('text')
      .classed('highest-availability-icon', true)
      .attr('x', 440)
      .attr('y', 45)
      .text("\uf102");

    this.append('circle')
      .classed('highest-availability-circle', true)
      .attr('cx', 450)
      .attr('cy', 35)
      .attr('r', 16)

    this.append('text')
      .classed('lowest-availability-icon', true)
      .attr('x', 640)
      .attr('y', 48)
      .text("\uf103");

    this.append('circle')
      .classed('lowest-availability-circle', true)
      .attr('cx', 650)
      .attr('cy', 35)
      .attr('r', 16)

    this.append('text')
      .classed('highest-availability-date', true)
      .classed('crunching-statistics', true)
      .attr('x', 475)
      .attr('y', 30)
      .text('Crunching Statistics...');

    this.append('text')
      .classed('highest-availability-count', true)
      .attr('x', 475)
      .attr('y', 54)

    this.append('text')
      .classed('lowest-availability-date', true)
      .classed('crunching-statistics', true)
      .attr('x', 675)
      .attr('y', 30)
      .text('Crunching Statistics...');

    this.append('text')
      .classed('lowest-availability-count', true)
      .attr('x', 675)
      .attr('y', 54)

    this.append('text')
      .classed('peak-timing-title', true)
      .attr('x', 0)
      .attr('y', 25)
      .text('Peak Hours');

    this.append('text')
      .classed('peak-timing-title-small', true)
      .attr('x', 0)
      .attr('y', 48)
      .text('6AM - 9AM');

    this.append('text')
      .classed('peak-timing-title-small', true)
      .attr('x', 0)
      .attr('y', 83)
      .text('6PM - 11PM');
    
    for (var i=0; i < 2; i++) {
      this.append('text')
        .classed('peak-timing-count', true)
        .classed('crunching-statistics', true)
        .attr('x', 125)
        .attr('y', 48 + (i*35))
        .text('Crunching Statistics...');
    }

    this.append('text')
      .classed('offpeak-timing-title', true)
      .attr('x', 0)
      .attr('y', 125)
      .text('Off-peak Hours');

    this.append('text')
      .classed('offpeak-timing-title-small', true)
      .attr('x', 0)
      .attr('y', 148)
      .text('10AM - 5PM');

    this.append('text')
      .classed('offpeak-timing-title-small', true)
      .attr('x', 0)
      .attr('y', 183)
      .text('12AM - 5AM');

    for (var i=0; i < 2; i++) {
      this.append('text')
        .classed('offpeak-timing-count', true)
        .classed('crunching-statistics', true)
        .attr('x', 125)
        .attr('y', 148 + (i*35))
        .text('Crunching Statistics...');
    }
  }

  plotLast14daysChart = function(params) {
    var margin = {top: 150, right: 20, bottom: 50, left: 0}
    var width = this.attr("width") - margin.left - margin.right;
    var height = this.attr("height") - margin.top - margin.bottom;
    var g = this.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    
    // get the lowest and highest availability
    Object.keys(params.last14DaysHourlyTaxiAvailabilityCountData).map(function(key, index) {
      if (highestTaxiAvailability == null) {
        highestTaxiAvailability = {};
        highestTaxiAvailability.key = key;
        highestTaxiAvailability.value = params.last14DaysHourlyTaxiAvailabilityCountData[key];
      } else {
        if ( highestTaxiAvailability.value < params.last14DaysHourlyTaxiAvailabilityCountData[key] ) {
          highestTaxiAvailability.key = key;
          highestTaxiAvailability.value = params.last14DaysHourlyTaxiAvailabilityCountData[key];
        }
      }

      if (lowestTaxiAvailability == null) {
        lowestTaxiAvailability = {};
        lowestTaxiAvailability.key = key;
        lowestTaxiAvailability.value = params.last14DaysHourlyTaxiAvailabilityCountData[key];
      } else {
        if ( lowestTaxiAvailability.value > params.last14DaysHourlyTaxiAvailabilityCountData[key] ) {
          lowestTaxiAvailability.key = key;
          lowestTaxiAvailability.value = params.last14DaysHourlyTaxiAvailabilityCountData[key];
        }
      }
    });

    var xLast2Weeks = d3.scaleLinear()
      .domain([0, 10000])
      .range([0, 230]);

    var colorScale = d3.scaleLinear()
      .domain([0, 10000])
      .range(['#333', '#F4D03F']);

    weeklyStatisticsChartSvg.select('.highest-availability-date')
      .classed('crunching-statistics', false)
      .attr('opacity', 0)
      .transition()
      .duration(500)
      .attr('opacity', 1)
      .text(highestTaxiAvailability.key);

    weeklyStatisticsChartSvg.select('.highest-availability-count')
      .classed('crunching-statistics', false)
      .transition()
      .duration(500)
      .on("start", function repeat() {
          d3.active(this)
            .tween("text", function() {
          var that = d3.select(this);
          var i = d3.interpolateNumber(0, highestTaxiAvailability.value);
          return function(t) { that.text(format(i(t)) + " Taxis"); };
        })
      });

    weeklyStatisticsChartSvg.select('.lowest-availability-date')
      .classed('crunching-statistics', false)
      .attr('opacity', 0)
      .transition()
      .duration(500)
      .attr('opacity', 1)
      .text(lowestTaxiAvailability.key);

    weeklyStatisticsChartSvg.select('.lowest-availability-count')
      .classed('crunching-statistics', false)
      .transition()
      .duration(500)
      .on("start", function repeat() {
          d3.active(this)
            .tween("text", function() {
          var that = d3.select(this);
          var i = d3.interpolateNumber(0, lowestTaxiAvailability.value);
          return function(t) { that.text(format(i(t)) + " Taxis"); };
        })
      });

    // render horizontal barchart
    var hourlyPeakTaxiAvailabilityCount1 = [];
    var hourlyPeakTaxiAvailabilityCount2 = [];
    var hourlyOffPeakTaxiAvailabilityCount1 = [];
    var hourlyOffPeakTaxiAvailabilityCount2 = [];
    
    Object.keys(params.hourlyTaxiAvailabilityCountData).map(function(key, index) {
      switch(key) {
        case '6AM': case '7AM': case '8AM': case '9AM':
          hourlyPeakTaxiAvailabilityCount1.push(params.hourlyTaxiAvailabilityCountData[key]);
          break;
        case '6PM': case '7PM': case '8PM': case '9PM': case '10PM': case '11PM':
          hourlyPeakTaxiAvailabilityCount2.push(params.hourlyTaxiAvailabilityCountData[key]);
          break;
        case '10AM': case '11AM': case '12PM': case '1PM': case '2PM': case '3PM': case '4PM': case '5PM':
          hourlyOffPeakTaxiAvailabilityCount1.push(params.hourlyTaxiAvailabilityCountData[key]);
          break;
        case '12AM': case '1AM': case '2AM': case '3AM': case '4AM': case '5AM':
          hourlyOffPeakTaxiAvailabilityCount2.push(params.hourlyTaxiAvailabilityCountData[key]);
          break;
      }
    });
    
    this.selectAll('.peak-timing-count').remove()
    this.selectAll('.offpeak-timing-count').remove()
    
    // peak
    hourlyPeakTaxiAvailabilityCount = [hourlyPeakTaxiAvailabilityCount1, hourlyPeakTaxiAvailabilityCount2];
    for (var i=0; i < hourlyPeakTaxiAvailabilityCount.length; i++) {
      var flattenArray = [];
      hourlyPeakTaxiAvailabilityCount[i].forEach(function(array) {
        flattenArray = flattenArray.concat(array);
      });

      var sum = flattenArray.reduce(function(a, b) { return a + b; });
      var avg = Math.round(sum / flattenArray.length);
      var minRange = Math.min.apply(Math, flattenArray);
      var maxRange = Math.max.apply(Math, flattenArray);

      this.append('line')
        .classed('bar-line', true)
        .attr('x1', 125)
        .attr('x2', 125)
        .attr('y1', 43 + (i*35))
        .attr('y2', 43 + (i*35))
        .attr('opacity', 0)
        .transition()
        .delay(50)
        .duration(200)
        .attr('opacity', 0.6)
        .attr('x2', 125 + xLast2Weeks(10000))
        .ease(d3.easeLinear)

      this.append('line')
        .classed('bar-line', true)
        .attr('x1', 125)
        .attr('x2', 125)
        .attr('y1', 40 + (i*35))
        .attr('y2', 46 + (i*35))
        .attr('opacity', 0.6)

      this.append('line')
        .classed('bar-line', true)
        .attr('x1', 125 + xLast2Weeks(10000))
        .attr('x2', 125 + xLast2Weeks(10000))
        .attr('y1', 40 + (i*35))
        .attr('y2', 46 + (i*35))
        .attr('opacity', 0)
        .transition()
        .delay(250)
        .duration(50)
        .attr('opacity', 0.6)
        .ease(d3.easeLinear)

      this.append('rect')
        .classed('horizontal-bar', true)
        .attr('x', 125 + xLast2Weeks(minRange))
        .attr('y', 37 + (i*35))
        .attr('rx', 2)
        .attr('ry', 2)
        .attr('height', 12)
        .attr('width', 0)
        .transition()
        .delay(250)
        .duration(300)
        .attr('width', xLast2Weeks(maxRange) - xLast2Weeks(minRange))
        .style('fill', colorScale(maxRange))
        .ease(d3.easeLinear)

      this.append('circle')
        .classed('horizontal-bar-circle', true)
        .attr('cx', 125 + xLast2Weeks(avg))
        .attr('cy', 43 + (i*35))
        .attr("r", 3)
        .attr('opacity', 0)
        .transition()
        .delay(700)
        .duration(200)
        .attr('opacity', 1)
        .ease(d3.easeLinear)

      this.append('text')
        .classed('horizontal-bar-value', true)
        .attr('x', 125 + xLast2Weeks(minRange))
        .attr('y', 62 + (i*35))
        .attr('opacity', 0)
        .text(minRange)
        .transition()
        .delay(500)
        .duration(300)
        .attr('opacity', 1)
        .ease(d3.easeLinear)

      this.append('text')
        .classed('horizontal-bar-value', true)
        .attr('x', 125 + xLast2Weeks(maxRange))
        .attr('y', 62 + (i*35))
        .attr('opacity', 0)
        .text(maxRange)
        .transition()
        .delay(500)
        .duration(300)
        .attr('opacity', 1)
        .ease(d3.easeLinear)

      this.append('text')
        .classed('horizontal-bar-value', true)
        .attr('x', 125 + xLast2Weeks(avg))
        .attr('y', 62 + (i*35))
        .attr('opacity', 0)
        .text(avg)
        .transition()
        .delay(500)
        .duration(300)
        .attr('opacity', 1)
        .ease(d3.easeLinear)
    }

    // offpeak
    hourlyOffPeakTaxiAvailabilityCount = [hourlyOffPeakTaxiAvailabilityCount1, hourlyOffPeakTaxiAvailabilityCount2];
    for (var i=0; i < hourlyOffPeakTaxiAvailabilityCount.length; i++) {
      var flattenArray = [];
      hourlyOffPeakTaxiAvailabilityCount[i].forEach(function(array) {
        flattenArray = flattenArray.concat(array);
      });

      var sum = flattenArray.reduce(function(a, b) { return a + b; });
      var avg = Math.round(sum / flattenArray.length);
      var minRange = Math.min.apply(Math, flattenArray);
      var maxRange = Math.max.apply(Math, flattenArray);

      this.append('line')
        .classed('bar-line', true)
        .attr('x1', 125)
        .attr('x2', 125)
        .attr('y1', 143 + (i*35))
        .attr('y2', 143 + (i*35))
        .attr('opacity', 0)
        .transition()
        .delay(50)
        .duration(200)
        .attr('opacity', 0.8)
        .attr('x2', 125 + xLast2Weeks(10000))
        .ease(d3.easeLinear)

      this.append('line')
        .classed('bar-line', true)
        .attr('x1', 125)
        .attr('x2', 125)
        .attr('y1', 140 + (i*35))
        .attr('y2', 146 + (i*35))
        .attr('opacity', 0.6)

      this.append('line')
        .classed('bar-line', true)
        .attr('x1', 125 + xLast2Weeks(10000))
        .attr('x2', 125 + xLast2Weeks(10000))
        .attr('y1', 140 + (i*35))
        .attr('y2', 146 + (i*35))
        .attr('opacity', 0)
        .transition()
        .delay(250)
        .duration(50)
        .attr('opacity', 0.6)
        .ease(d3.easeLinear)
      
      this.append('rect')
        .classed('horizontal-bar', true)
        .attr('x', 125 + xLast2Weeks(minRange))
        .attr('y', 137 + (i*35))
        .attr('rx', 2)
        .attr('ry', 2)
        .attr('height', 12)
        .attr('width', 0)
        .transition()
        .delay(250)
        .duration(300)
        .attr('width', xLast2Weeks(maxRange) - xLast2Weeks(minRange))
        .style('fill', colorScale(maxRange))
        .ease(d3.easeLinear)

      this.append('circle')
        .classed('horizontal-bar-circle', true)
        .attr('cx', 125 + xLast2Weeks(avg))
        .attr('cy', 143 + (i*35))
        .attr("r", 3)
        .attr('opacity', 0)
        .transition()
        .delay(700)
        .duration(200)
        .attr('opacity', 1)
        .ease(d3.easeLinear)

      this.append('text')
        .classed('horizontal-bar-value', true)
        .attr('x', 125 + xLast2Weeks(minRange))
        .attr('y', 162 + (i*35))
        .attr('opacity', 0)
        .text(minRange)
        .transition()
        .delay(500)
        .duration(300)
        .attr('opacity', 1)
        .ease(d3.easeLinear)

      this.append('text')
        .classed('horizontal-bar-value', true)
        .attr('x', 125 + xLast2Weeks(maxRange))
        .attr('y', 162 + (i*35))
        .attr('opacity', 0)
        .text(maxRange)
        .transition()
        .delay(500)
        .duration(300)
        .attr('opacity', 1)
        .ease(d3.easeLinear)

      this.append('text')
        .classed('horizontal-bar-value', true)
        .attr('x', 125 + xLast2Weeks(avg))
        .attr('y', 162 + (i*35))
        .attr('opacity', 0)
        .text(avg)
        .transition()
        .delay(500)
        .duration(300)
        .attr('opacity', 1)
        .ease(d3.easeLinear)
    }

    // this.select('.peak-timing-count-1')
    //   .classed('crunching-statistics', false)
    //   .transition()
    //   .duration(500)
    //   .on("start", function repeat() {
    //       d3.active(this)
    //         .tween("text", function() {
    //       var that = d3.select(this);
    //       var flattenArray = [];
    //       hourlyPeakTaxiAvailabilityCount1.forEach(function(array) {
    //         flattenArray = flattenArray.concat(array);
    //       });
    //       var sum = flattenArray.reduce(function(a, b) { return a + b; });
    //       var avg = d3.interpolateNumber(0, Math.round(sum / flattenArray.length));
    //       var minRange = d3.interpolateNumber(0, Math.min.apply(Math, flattenArray));
    //       var maxRange = d3.interpolateNumber(0, Math.max.apply(Math, flattenArray));
    //       return function(t) { that.text("Average " + format(avg(t)) + " (Min " + format(minRange(t)) + " - Max " + format(maxRange(t)) + ")"); };
    //     })
    //   });

    this.select('.peak-timing-count-2')
      .classed('crunching-statistics', false)
      .transition()
      .duration(500)
      .on("start", function repeat() {
          d3.active(this)
            .tween("text", function() {
          var that = d3.select(this);
          var flattenArray = [];
          hourlyPeakTaxiAvailabilityCount2.forEach(function(array) {
            flattenArray = flattenArray.concat(array);
          });
          var sum = flattenArray.reduce(function(a, b) { return a + b; });
          var avg = d3.interpolateNumber(0, Math.round(sum / flattenArray.length));
          var minRange = d3.interpolateNumber(0, Math.min.apply(Math, flattenArray));
          var maxRange = d3.interpolateNumber(0, Math.max.apply(Math, flattenArray));
          return function(t) { that.text("Average " + format(avg(t)) + " (Min " + format(minRange(t)) + " - Max " + format(maxRange(t)) + ")"); };
        })
      });

    this.select('.offpeak-timing-count-1')
      .classed('crunching-statistics', false)
      .transition()
      .duration(500)
      .on("start", function repeat() {
          d3.active(this)
            .tween("text", function() {
          var that = d3.select(this);
          var flattenArray = [];
          hourlyOffPeakTaxiAvailabilityCount1.forEach(function(array) {
            flattenArray = flattenArray.concat(array);
          });
          var sum = flattenArray.reduce(function(a, b) { return a + b; });
          var avg = d3.interpolateNumber(0, Math.round(sum / flattenArray.length));
          var minRange = d3.interpolateNumber(0, Math.min.apply(Math, flattenArray));
          var maxRange = d3.interpolateNumber(0, Math.max.apply(Math, flattenArray));
          return function(t) { that.text("Average " + format(avg(t)) + " (Min " + format(minRange(t)) + " - Max " + format(maxRange(t)) + ")"); };
        })
      });

    this.select('.offpeak-timing-count-2')
      .classed('crunching-statistics', false)
      .transition()
      .duration(500)
      .on("start", function repeat() {
          d3.active(this)
            .tween("text", function() {
          var that = d3.select(this);
          var flattenArray = [];
          hourlyOffPeakTaxiAvailabilityCount2.forEach(function(array) {
            flattenArray = flattenArray.concat(array);
          });
          var sum = flattenArray.reduce(function(a, b) { return a + b; });
          var avg = d3.interpolateNumber(0, Math.round(sum / flattenArray.length));
          var minRange = d3.interpolateNumber(0, Math.min.apply(Math, flattenArray));
          var maxRange = d3.interpolateNumber(0, Math.max.apply(Math, flattenArray));
          return function(t) { that.text("Average " + format(avg(t)) + " (Min " + format(minRange(t)) + " - Max " + format(maxRange(t)) + ")"); };
        })
      });
  }

  goToLast100MinutesChartBar = function(index, datetimeData, taxiAvailabilityCountData, taxiCoordinatesData) {
    var new_index = index;
    var prev_index = currentIndexPointer;
    var height = 90;

    currentIndexPointer = index;

    hexLayer.data(taxiCoordinatesData[new_index]);

    last100MinutesChartSvg.select('.availability-chart-pointer')
      .transition()
      .attr("transform", "translate(" + ((15 * index) + 47) + "," + (height + 160) + ")")
      .duration(300);

    last100MinutesChartSvg.select('.displayed-availability-datetime')
          .attr('x', 50)
          .attr('y', 81)
          .attr('opacity', 0)
          .transition()
      .duration(500)
      .attr('opacity', 1)
          .text(datetimeData[new_index].format('D MMM YYYY H:mmA'));

    last100MinutesChartSvg.select('.displayed-availability-count')
      .transition()
      .duration(500)
      .on("start", function repeat() {
          d3.active(this)
            .tween("text", function() {
          var that = d3.select(this);
          i = d3.interpolateNumber(taxiAvailabilityCountData[prev_index], taxiAvailabilityCountData[new_index]);
          return function(t) { that.text(format(i(t))); };
        })
      });
  }
  

  var apiKey = "B8zv9vTjZjAoGWhUA6Uv2457LKJjfKQd";
  var apiUrl = "https://api.data.gov.sg/v1/transport/taxi-availability";

  // core dataset arrays
  // last 100 mins (every 5 minutes)
  var taxiAvailabilityDateTime = [];
  var taxiAvailabilityCountHash = {};
  var taxiAvailabilityCount = [];
  var taxiCoordinatesHash = {};
  var taxiCoordinates = [];
  var initiateFetchCount = 20;
  var fireCount = 0;
  var dataSetCount = 0;
  var currentIndexPointer = 0;

  // last 2 weeks (366 hours)
  var hourlyTaxiAvailabilityDateTime = [];
  var last14DaysHourlyTaxiAvailabilityCountHash = {};
  var hourlyTaxiAvailabilityCountHash = {};

  var hourlyInitiateFetchCount = 366;
  var hourlyFireCount = 0;
  var hourlyDataSetCount = 0;
  var highestTaxiAvailability = null;
  var lowestTaxiAvailability = null;
  var peakTaxiAvailability = null;
  var nonPeakTaxiAvailability = null;

  var i;

  var y;
  var colorScale;
  
  // player variables
  var interval = null;
  var currentPlayIndexPointer = 0;
  var isPlayStart = false;
  
  // format
  var format = d3.format("d");

  // map setup
  var mymap = L.map('mapid').setView([1.2821, 103.8198], 11);

  L.tileLayer('https://api.mapbox.com/styles/v1/bento85/ciy2b3wu900f82sqku2keu3uv/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoiYmVudG84NSIsImEiOiJjaXkyYXpqbjUwMDFqMzJwcGNtOGo4Z2o1In0.EObxyQlBc6boiDJQdihPYQ', {
    attribution: 'Taxi availability data &copy; <a href="https://data.gov.sg/">Data.gov.sg</a>, Imagery &copy; <a href="https://mapbox.com/">Mapbox</a>',
    maxZoom: 18
  }).addTo(mymap);

  // Options for the hexbin layer
  var options = {
    radius : 9,                            // Size of the hexagons/bins
    opacity: 0.7,                           // Opacity of the hexagonal layer
    duration: 1000,                          // millisecond duration of d3 transitions (see note below)
    lng: function(d) { return d[0]; },       // longitude accessor
    lat: function(d) { return d[1]; },       // latitude accessor
    value: function(d) { return d.length; }, // value accessor - derives the bin value
    valueFloor: 0,                          // override the color scale domain low value
    valueCeil: 60,                   // override the color scale domain high value
    colorRange: ['#333', '#F4D03F'],     // default color range for the heat map (see note below)
    onmouseover: function(d, node, layer) {
      d3.select(node)
        .attr('stroke', 'black')
        .attr('stroke-width', 2)
        .attr('stroke-opacity', 1)
      d3.select(node).moveToFront();

      div.transition()
        .duration(200)
        .style("opacity", .9)
      div
        .style("left", (d3.event.pageX + 20) + "px")
        .style("top", (d3.event.pageY - 28) + "px");
      div_content.html(d.length)
    },
    onmouseout: function(d, node, layer) {
      // console.log(d);
      d3.select(node)
        .attr('stroke', '#999')
        .attr('stroke-width', 1)
        .attr('stroke-opacity', 0.1)

      div.transition()
        .duration(300)
        .style("opacity", 0);
    },
    onclick: function(d, node, layer) {
    }
  };

  // Create the hexbin layer and add it to the map
  var hexLayer = L.hexbinLayer(options).addTo(mymap);

  // --- CHART SETUP ---
  var last100MinutesChartSvg = d3.select(".availability-chart").append("svg")
    .attr('width', 400)
    .attr('height', 300);
  var weeklyStatisticsChartSvg = d3.select(".weekly-statistics-chart").append("svg")
    .attr('width', 850)
    .attr('height', 245);

  // ensure that data is drawn based on last 20 intervals of 5 mins
  var now = Date.now();
  for (i=(initiateFetchCount-1); i >= 0; i--) {
    var dateTime = moment(now).startOf('minute');
    minute = parseInt(dateTime.format('m'));
    toSubstract = minute % 5;
    // data might not be ready, take further step back
    // e.g. 10.47AM, take 10.40AM instead
    if (toSubstract < 3)
      dateTime.subtract(toSubstract + 5 + ((i) * 5), 'minutes');
    else
      dateTime.subtract(toSubstract + ((i) * 5), 'minutes');

    taxiAvailabilityDateTime.push(dateTime);
    fetchTaxiDataLast100Minutes(dateTime);
  }
  
  // tooltip
  var div = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  div.append("div")
    .attr("class", "tooltip-title")
    .text("Taxi Count");

  var div_content = div.append("div")
    .attr("class", "tooltip-content");
  

  // play and pause
  $('.play-button').on('click', function() {
    // css reaction
    $(this).addClass('button-hide');
    $('.pause-button').removeClass('button-hide');

    var currentPlayIndexPointer = currentIndexPointer;
    var stopIndex = currentIndexPointer;
    isPlayStart = false;

    interval = setInterval(function() {
      if (currentPlayIndexPointer == (initiateFetchCount - 1))
        currentPlayIndexPointer = 0;
      else
        currentPlayIndexPointer++;
      
      if (isPlayStart == true && currentPlayIndexPointer == stopIndex) {
        // css reaction
        $('.pause-button').addClass('button-hide');
        $('.play-button').removeClass('button-hide');

        clearInterval(interval);
      }
      
      goToLast100MinutesChartBar(currentPlayIndexPointer, taxiAvailabilityDateTime, taxiAvailabilityCount, taxiCoordinates);

      isPlayStart = true;
    }, 1500);
  });

  $('.pause-button').on('click', function() {
    // css reaction
    $(this).addClass('button-hide');
    $('.play-button').removeClass('button-hide');

    clearInterval(interval);
  });
});