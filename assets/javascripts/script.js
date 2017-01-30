$(function() {
  fetchTaxiAvailabilityData = function(current_datetime) {
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
        plotTaxiAvailabilityChart.call(taxiAvailabilityChartSvg, { 
          datetimeData: taxiAvailabilityDateTime, 
          taxiAvailabilityCountData: taxiAvailabilityCount,
          taxiCoordinatesData: taxiCoordinates
        });
        
        // take 1 step at a time, setup last 2 weeks after 100 minutes statistics is completed
        if (isLast14DaysDataFetched == false) {
          setupLast14DaysStatistics.call(weeklyStatisticsChartSvg);
          isLast14DaysDataFetched = true;
        }
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

          var hourly = dateTime.format('hA ddd');
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
  
  plotTaxiAvailabilityChart = function(params) {
    var margin = {top: 150, right: 20, bottom: 50, left: 0}
    var width = this.attr("width") - margin.left - margin.right;
    var height = this.attr("height") - margin.top - margin.bottom;
    var g = this.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var yTaxiAvailability = d3.scaleLinear()
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
      .attr('y', yTaxiAvailability(0))
      .attr("width", 12)
      .attr('opacity', 0.8)
      .on("click", function(d, i) {
        goToTaxiAvailabilityChartBar(i, params.datetimeData, params.taxiAvailabilityCountData, params.taxiCoordinatesData);
      })
      .transition()
      .delay(function(d,i){ return 50*i; })
      .duration(function(d,i){ return 150; })
      .attr('y', function(d, i) { return yTaxiAvailability(d); })
      .attr('height', function(d, i) { return height - yTaxiAvailability(d); })
      .style('fill', function(d) { return colorScale(d); })
      .ease(d3.easeLinear)

    taxiAvailabilityChartPointerG = this.append('g')
      .classed('availability-chart-pointer', true)

    taxiAvailabilityChartPointerG
      .append('polygon')
      .attr('fill', 'white')
      .attr('stroke-width', 0)
      .attr('points', "03,09 09,03 15,09")

    taxiAvailabilityChartPointerG
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
      .text(params.datetimeData[params.datetimeData.length - 1].format('D MMM YYYY h:mmA'));

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
      .classed('peak-timing-title', true)
      .attr('x', 455)
      .attr('y', 25)
      .text('Best Peak Hours Time to Hire Taxi');
    
    this.append('text')
      .classed('highest-availability-icon-1', true)
      .attr('x', 460)
      .attr('y', 65)
      .text("\uf102");

    this.append('circle')
      .classed('highest-availability-circle-1', true)
      .attr('cx', 470)
      .attr('cy', 55)
      .attr('r', 16)
    
    this.append('text')
      .classed('highest-availability-icon-2', true)
      .attr('x', 660)
      .attr('y', 65)
      .text("\uf102");

    this.append('circle')
      .classed('highest-availability-circle-2', true)
      .attr('cx', 670)
      .attr('cy', 55)
      .attr('r', 16)

    this.append('text')
      .classed('peak-timing-title', true)
      .attr('x', 455)
      .attr('y', 125)
      .text('Best Off-peak Hours Time to Hire Taxi');

    this.append('text')
      .classed('lowest-availability-icon-1', true)
      .attr('x', 460)
      .attr('y', 168)
      .text("\uf103");

    this.append('circle')
      .classed('lowest-availability-circle-1', true)
      .attr('cx', 470)
      .attr('cy', 155)
      .attr('r', 16)

    this.append('text')
      .classed('lowest-availability-icon-2', true)
      .attr('x', 660)
      .attr('y', 168)
      .text("\uf103");

    this.append('circle')
      .classed('lowest-availability-circle-2', true)
      .attr('cx', 670)
      .attr('cy', 155)
      .attr('r', 16)

    this.append('text')
      .classed('highest-availability-date-1', true)
      .classed('crunching-statistics', true)
      .attr('x', 495)
      .attr('y', 50)
      .text('Crunching Statistics...');

    this.append('text')
      .classed('highest-availability-count-1', true)
      .attr('x', 495)
      .attr('y', 74)

    this.append('text')
      .classed('highest-availability-date-2', true)
      .classed('crunching-statistics', true)
      .attr('x', 695)
      .attr('y', 50)
      .text('Crunching Statistics...');

    this.append('text')
      .classed('highest-availability-count-2', true)
      .attr('x', 695)
      .attr('y', 74)

    this.append('text')
      .classed('lowest-availability-date-1', true)
      .classed('crunching-statistics', true)
      .attr('x', 495)
      .attr('y', 150)
      .text('Crunching Statistics...');

    this.append('text')
      .classed('lowest-availability-count-1', true)
      .attr('x', 495)
      .attr('y', 174)

    this.append('text')
      .classed('lowest-availability-date-2', true)
      .classed('crunching-statistics', true)
      .attr('x', 695)
      .attr('y', 150)
      .text('Crunching Statistics...');

    this.append('text')
      .classed('lowest-availability-count-2', true)
      .attr('x', 695)
      .attr('y', 174)

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

    // render horizontal barchart
    var hourlyPeakTaxiAvailabilityCount1 = [];
    var hourlyPeakTaxiAvailabilityCount2 = [];
    var hourlyOffPeakTaxiAvailabilityCount1 = [];
    var hourlyOffPeakTaxiAvailabilityCount2 = [];
    
    // compute best timing hiring
    var peakHighTaxiAvgAvailabilityCount1 = {};
    var peakHighTaxiAvgAvailabilityCount2 = {};
    var offPeakHighTaxiAvgAvailabilityCount1 = {};
    var offPeakHighTaxiAvgAvailabilityCount2 = {};
    var breakdownStatsHash = {};

    Object.keys(params.hourlyTaxiAvailabilityCountData).map(function(key, index) {
      time = key.split(' ')[0];
      switch(time) {
        case '6AM': case '7AM': case '8AM': case '9AM':
          // for rendering horizontal barchart - allocating to respective peak/offpeak slots
          if (breakdownStatsHash['6AM - 9AM'] == null) { breakdownStatsHash['6AM - 9AM'] = {}; }
          if (breakdownStatsHash['6AM - 9AM'][time] == null) { breakdownStatsHash['6AM - 9AM'][time] = []; }
          breakdownStatsHash['6AM - 9AM'][time].push(params.hourlyTaxiAvailabilityCountData[key]);

          // for rendering horizontal barchart
          hourlyPeakTaxiAvailabilityCount1.push(params.hourlyTaxiAvailabilityCountData[key]);
          break;
        case '6PM': case '7PM': case '8PM': case '9PM': case '10PM': case '11PM':
          // for rendering horizontal barchart - allocating to respective peak/offpeak slots
          if (breakdownStatsHash['6PM - 11PM'] == null) { breakdownStatsHash['6PM - 11PM'] = {}; }
          if (breakdownStatsHash['6PM - 11PM'][time] == null) { breakdownStatsHash['6PM - 11PM'][time] = []; }
          breakdownStatsHash['6PM - 11PM'][time].push(params.hourlyTaxiAvailabilityCountData[key]);

          // for rendering horizontal barchart
          hourlyPeakTaxiAvailabilityCount2.push(params.hourlyTaxiAvailabilityCountData[key]);
          break;
        case '10AM': case '11AM': case '12PM': case '1PM': case '2PM': case '3PM': case '4PM': case '5PM':
          // for rendering horizontal barchart - allocating to respective peak/offpeak slots
          if (breakdownStatsHash['10AM - 5PM'] == null) { breakdownStatsHash['10AM - 5PM'] = {}; }
          if (breakdownStatsHash['10AM - 5PM'][time] == null) { breakdownStatsHash['10AM - 5PM'][time] = []; }
          breakdownStatsHash['10AM - 5PM'][time].push(params.hourlyTaxiAvailabilityCountData[key]);

          // for rendering horizontal barchart
          hourlyOffPeakTaxiAvailabilityCount1.push(params.hourlyTaxiAvailabilityCountData[key]);
          break;
        case '12AM': case '1AM': case '2AM': case '3AM': case '4AM': case '5AM':
          // for rendering horizontal barchart - allocating to respective peak/offpeak slots
          if (breakdownStatsHash['12AM - 5AM'] == null) { breakdownStatsHash['12AM - 5AM'] = {}; }
          if (breakdownStatsHash['12AM - 5AM'][time] == null) { breakdownStatsHash['12AM - 5AM'][time] = []; }
          breakdownStatsHash['12AM - 5AM'][time].push(params.hourlyTaxiAvailabilityCountData[key]);

          // for rendering horizontal barchart
          hourlyOffPeakTaxiAvailabilityCount2.push(params.hourlyTaxiAvailabilityCountData[key]);
          break;
      }
    });

    // find the best time/most availability in peak hours 1
    Object.keys(breakdownStatsHash['6AM - 9AM']).map(function(key, index) {
      if ( peakHighTaxiAvgAvailabilityCount1.count == null )
        peakHighTaxiAvgAvailabilityCount1.count = 0;
      
      var flattenOverallArray = [];
      breakdownStatsHash['6AM - 9AM'][key].forEach(function(array) {
        flattenOverallArray = flattenOverallArray.concat(array);
      });

      var sum = flattenOverallArray.reduce(function(a, b) { return a + b; });
      var avg = Math.round(sum / flattenOverallArray.length);

      if (avg > peakHighTaxiAvgAvailabilityCount1.count) {
        peakHighTaxiAvgAvailabilityCount1.time = key;
        peakHighTaxiAvgAvailabilityCount1.count = avg;
      }
    });
    
    // find the best time/most availability in peak hours 2
    Object.keys(breakdownStatsHash['6PM - 11PM']).map(function(key, index) {
      if ( peakHighTaxiAvgAvailabilityCount2.count == null )
        peakHighTaxiAvgAvailabilityCount2.count = 0;
      
      var flattenOverallArray = [];
      breakdownStatsHash['6PM - 11PM'][key].forEach(function(array) {
        flattenOverallArray = flattenOverallArray.concat(array);
      });

      var sum = flattenOverallArray.reduce(function(a, b) { return a + b; });
      var avg = Math.round(sum / flattenOverallArray.length);

      if (avg > peakHighTaxiAvgAvailabilityCount2.count) {
        peakHighTaxiAvgAvailabilityCount2.time = key;
        peakHighTaxiAvgAvailabilityCount2.count = avg;
      }
    });

    // find the best time/most availability in peak hours 1
    Object.keys(breakdownStatsHash['10AM - 5PM']).map(function(key, index) {
      if ( offPeakHighTaxiAvgAvailabilityCount1.count == null )
        offPeakHighTaxiAvgAvailabilityCount1.count = 0;
      
      var flattenOverallArray = [];
      breakdownStatsHash['10AM - 5PM'][key].forEach(function(array) {
        flattenOverallArray = flattenOverallArray.concat(array);
      });

      var sum = flattenOverallArray.reduce(function(a, b) { return a + b; });
      var avg = Math.round(sum / flattenOverallArray.length);

      if (avg > offPeakHighTaxiAvgAvailabilityCount1.count) {
        offPeakHighTaxiAvgAvailabilityCount1.time = key;
        offPeakHighTaxiAvgAvailabilityCount1.count = avg;
      }
    });

    // find the best time/most availability in peak hours 2
    Object.keys(breakdownStatsHash['10AM - 5PM']).map(function(key, index) {
      if ( offPeakHighTaxiAvgAvailabilityCount2.count == null ) {
        offPeakHighTaxiAvgAvailabilityCount2.time = "";
        offPeakHighTaxiAvgAvailabilityCount2.count = 0;
      }
      
      var flattenOverallArray = [];
      breakdownStatsHash['10AM - 5PM'][key].forEach(function(array) {
        flattenOverallArray = flattenOverallArray.concat(array);
      });

      var sum = flattenOverallArray.reduce(function(a, b) { return a + b; });
      var avg = Math.round(sum / flattenOverallArray.length);

      if (avg > offPeakHighTaxiAvgAvailabilityCount2.count && avg != offPeakHighTaxiAvgAvailabilityCount1.count) {
        offPeakHighTaxiAvgAvailabilityCount2.time = key;
        offPeakHighTaxiAvgAvailabilityCount2.count = avg;
      }
    });

    weeklyStatisticsChartSvg.select('.highest-availability-date-1')
      .classed('crunching-statistics', false)
      .attr('opacity', 0)
      .transition()
      .duration(500)
      .attr('opacity', 1)
      .text(peakHighTaxiAvgAvailabilityCount1.time);

    weeklyStatisticsChartSvg.select('.highest-availability-date-2')
      .classed('crunching-statistics', false)
      .attr('opacity', 0)
      .transition()
      .duration(500)
      .attr('opacity', 1)
      .text(peakHighTaxiAvgAvailabilityCount2.time);

    weeklyStatisticsChartSvg.select('.highest-availability-count-1')
      .classed('crunching-statistics', false)
      .transition()
      .duration(500)
      .on("start", function repeat() {
          d3.active(this)
            .tween("text", function() {
          var that = d3.select(this);
          var i = d3.interpolateNumber(0, peakHighTaxiAvgAvailabilityCount1.count);
          return function(t) { that.text(format(i(t)) + " Taxis"); };
        })
      });

    weeklyStatisticsChartSvg.select('.highest-availability-count-2')
      .classed('crunching-statistics', false)
      .transition()
      .duration(500)
      .on("start", function repeat() {
          d3.active(this)
            .tween("text", function() {
          var that = d3.select(this);
          var i = d3.interpolateNumber(0, peakHighTaxiAvgAvailabilityCount2.count);
          return function(t) { that.text(format(i(t)) + " Taxis"); };
        })
      });

    weeklyStatisticsChartSvg.select('.lowest-availability-date-1')
      .classed('crunching-statistics', false)
      .attr('opacity', 0)
      .transition()
      .duration(500)
      .attr('opacity', 1)
      .text(offPeakHighTaxiAvgAvailabilityCount1.time);

    weeklyStatisticsChartSvg.select('.lowest-availability-count-1')
      .classed('crunching-statistics', false)
      .transition()
      .duration(500)
      .on("start", function repeat() {
          d3.active(this)
            .tween("text", function() {
          var that = d3.select(this);
          var i = d3.interpolateNumber(0, offPeakHighTaxiAvgAvailabilityCount1.count);
          return function(t) { that.text(format(i(t)) + " Taxis"); };
        })
      });

    weeklyStatisticsChartSvg.select('.lowest-availability-date-2')
      .classed('crunching-statistics', false)
      .attr('opacity', 0)
      .transition()
      .duration(500)
      .attr('opacity', 1)
      .text(offPeakHighTaxiAvgAvailabilityCount2.time);

    weeklyStatisticsChartSvg.select('.lowest-availability-count-2')
      .classed('crunching-statistics', false)
      .transition()
      .duration(500)
      .on("start", function repeat() {
          d3.active(this)
            .tween("text", function() {
          var that = d3.select(this);
          var i = d3.interpolateNumber(0, offPeakHighTaxiAvgAvailabilityCount2.count);
          return function(t) { that.text(format(i(t)) + " Taxis"); };
        })
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

    $('#availability-select').prop('disabled', false);

    $('.show-more-peak-1').fadeIn();
    $('.show-more-peak-2').fadeIn();
    $('.show-more-offpeak-1').fadeIn();
    $('.show-more-offpeak-2').fadeIn();
  }

  goToTaxiAvailabilityChartBar = function(index, datetimeData, taxiAvailabilityCountData, taxiCoordinatesData) {
    var new_index = index;
    var prev_index = currentIndexPointer;
    var height = 90;

    currentIndexPointer = index;

    hexLayer.data(taxiCoordinatesData[new_index]);

    taxiAvailabilityChartSvg.select('.availability-chart-pointer')
      .transition()
      .attr("transform", "translate(" + ((15 * index) + 47) + "," + (height + 160) + ")")
      .duration(300);

    taxiAvailabilityChartSvg.select('.displayed-availability-datetime')
          .attr('x', 50)
          .attr('y', 81)
          .attr('opacity', 0)
          .transition()
      .duration(500)
      .attr('opacity', 1)
          .text(datetimeData[new_index].format('D MMM YYYY H:mmA'));

    taxiAvailabilityChartSvg.select('.displayed-availability-count')
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
  
  setupApiDateTime = function(number, unit) {
    taxiAvailabilityDateTime = [];
    taxiAvailabilityCountHash = {};
    taxiAvailabilityCount = [];
    taxiCoordinatesHash = {};
    taxiCoordinates = [];
    fireCount = 0;
    dataSetCount = 0;
    currentIndexPointer = 0;
    
    $(".availability-chart svg").empty();
    if (number == 60 && unit == 'minutes')
      $('.availability-chart-title').html('Taxi availability in the last 20 hours<br />(Play to see map density changes every hour)');
    else if (number == 30 && unit == 'minutes')
      $('.availability-chart-title').html('Taxi availability in the last 10 hours<br />(Play to see map density changes every 20 mins)');
    else if (number == 10 && unit == 'minutes')
      $('.availability-chart-title').html('Taxi availability in the last 200 mins<br />(Play to see map density changes every 10 mins)');
    else if (number == 5 && unit == 'minutes')
      $('.availability-chart-title').html('Taxi availability in the last 100 mins<br />(Play to see map density changes every 5 mins)');

    // ensure that data is drawn based on last 20 intervals of 5 mins
    var now = Date.now();
    for (i=(initiateFetchCount-1); i >= 0; i--) {
      var dateTime = moment(now).startOf(unit);
      minute = parseInt(dateTime.format('m'));
      toSubstract = minute % 5;
      // data might not be ready, take further step back
      // e.g. 10.47AM, take 10.40AM instead
      if (toSubstract < 3)
        dateTime.subtract(toSubstract + 5 + ((i) * number), unit);
      else
        dateTime.subtract(toSubstract + ((i) * number), unit);

      taxiAvailabilityDateTime.push(dateTime);
      fetchTaxiAvailabilityData(dateTime);
    }
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

  var isLast14DaysDataFetched = false;

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
  var taxiAvailabilityChartSvg = d3.select(".availability-chart").append("svg")
    .attr('width', 400)
    .attr('height', 300);
  var weeklyStatisticsChartSvg = d3.select(".weekly-statistics-chart").append("svg")
    .attr('width', 850)
    .attr('height', 245);
  
  $('#availability-select').prop('disabled', 'disabled');
  var selectValue = $('#availability-select').val().split('-');
  setupApiDateTime(parseInt(selectValue[0]), selectValue[1]);
  
  // tooltip
  var div = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  div.append("div")
    .attr("class", "tooltip-title")
    .text("Taxi Count");

  var div_content = div.append("div")
    .attr("class", "tooltip-content");


  $('#availability-select').on('change', function() {
    $('.pause-button').trigger('click');
    var selectValue = $('#availability-select').val().split('-');
    setupApiDateTime(parseInt(selectValue[0]), selectValue[1]);
  });

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
      
      goToTaxiAvailabilityChartBar(currentPlayIndexPointer, taxiAvailabilityDateTime, taxiAvailabilityCount, taxiCoordinates);

      isPlayStart = true;
    }, 1500);
  });

  $('.pause-button').on('click', function() {
    // css reaction
    $(this).addClass('button-hide');
    $('.play-button').removeClass('button-hide');

    clearInterval(interval);
  });

  $('.show-more-peak-1').on('click', function() {
    $('#breakdown-stats-modal-label').html('Peak Hours (6AM - 9AM)');
    $('#breakdown-stats-modal').modal('show');
  });

  $('.show-more-peak-2').on('click', function() {
    $('#breakdown-stats-modal-label').html('Peak Hours (6PM - 11PM)');
    $('#breakdown-stats-modal').modal('show');
  });

  $('.show-more-offpeak-1').on('click', function() {
    $('#breakdown-stats-modal-label').html('Off-peak Hours (10AM - 5PM)');
    $('#breakdown-stats-modal').modal('show');
  });

  $('.show-more-offpeak-2').on('click', function() {
    $('#breakdown-stats-modal-label').html('Off-peak Hours (12AM - 5AM)');
    $('#breakdown-stats-modal').modal('show');
  });
  
  // show modal
  $('#breakdown-stats-modal').on('show.bs.modal', function (event) {
    $('#breakdown-stats').empty();

    var breakdownStatsSvg = d3.select('#breakdown-stats').append("svg");

    var breakdownStats = [];
    if ($('#breakdown-stats-modal-label').html() == 'Peak Hours (6AM - 9AM)') {
      // 6AM
      breakdownStats.push({
        'weekday' : (hourlyTaxiAvailabilityCountHash['6AM Mon'].concat(hourlyTaxiAvailabilityCountHash['6AM Tue']).concat(hourlyTaxiAvailabilityCountHash['6AM Wed']).concat(hourlyTaxiAvailabilityCountHash['6AM Thu']).concat(hourlyTaxiAvailabilityCountHash['6AM Fri'])), 
        'weekend' : (hourlyTaxiAvailabilityCountHash['6AM Sat'].concat(hourlyTaxiAvailabilityCountHash['6AM Sun'])),
        'time' : '6AM'
      });
      // 7AM
      breakdownStats.push({
        'weekday' : (hourlyTaxiAvailabilityCountHash['7AM Mon'].concat(hourlyTaxiAvailabilityCountHash['7AM Tue']).concat(hourlyTaxiAvailabilityCountHash['7AM Wed']).concat(hourlyTaxiAvailabilityCountHash['7AM Thu']).concat(hourlyTaxiAvailabilityCountHash['7AM Fri'])),
        'weekend' : (hourlyTaxiAvailabilityCountHash['7AM Sat'].concat(hourlyTaxiAvailabilityCountHash['7AM Sun'])),
        'time' : '7AM'
      });
      // 8AM
      breakdownStats.push({
        'weekday' : (hourlyTaxiAvailabilityCountHash['8AM Mon'].concat(hourlyTaxiAvailabilityCountHash['8AM Tue']).concat(hourlyTaxiAvailabilityCountHash['8AM Wed']).concat(hourlyTaxiAvailabilityCountHash['8AM Thu']).concat(hourlyTaxiAvailabilityCountHash['8AM Fri'])),
        'weekend' : (hourlyTaxiAvailabilityCountHash['8AM Sat'].concat(hourlyTaxiAvailabilityCountHash['8AM Sun'])),
        'time' : '8AM'
      });
      // 9AM
      breakdownStats.push({
        'weekday' : (hourlyTaxiAvailabilityCountHash['9AM Mon'].concat(hourlyTaxiAvailabilityCountHash['9AM Tue']).concat(hourlyTaxiAvailabilityCountHash['9AM Wed']).concat(hourlyTaxiAvailabilityCountHash['9AM Thu']).concat(hourlyTaxiAvailabilityCountHash['9AM Fri'])),
        'weekend' : (hourlyTaxiAvailabilityCountHash['9AM Sat'].concat(hourlyTaxiAvailabilityCountHash['9AM Sun'])),
        'time' : '9AM'
      });
    } else if ($('#breakdown-stats-modal-label').html() == 'Peak Hours (6PM - 11PM)') {
      // 6PM
      breakdownStats.push({
        'weekday' : (hourlyTaxiAvailabilityCountHash['6PM Mon'].concat(hourlyTaxiAvailabilityCountHash['6PM Tue']).concat(hourlyTaxiAvailabilityCountHash['6PM Wed']).concat(hourlyTaxiAvailabilityCountHash['6PM Thu']).concat(hourlyTaxiAvailabilityCountHash['6PM Fri'])), 
        'weekend' : (hourlyTaxiAvailabilityCountHash['6PM Sat'].concat(hourlyTaxiAvailabilityCountHash['6PM Sun'])),
        'time' : '6PM'
      });
      // 7PM
      breakdownStats.push({
        'weekday' : (hourlyTaxiAvailabilityCountHash['7PM Mon'].concat(hourlyTaxiAvailabilityCountHash['7PM Tue']).concat(hourlyTaxiAvailabilityCountHash['7PM Wed']).concat(hourlyTaxiAvailabilityCountHash['7PM Thu']).concat(hourlyTaxiAvailabilityCountHash['7PM Fri'])),
        'weekend' : (hourlyTaxiAvailabilityCountHash['7PM Sat'].concat(hourlyTaxiAvailabilityCountHash['7PM Sun'])),
        'time' : '7PM'
      });
      // 8PM
      breakdownStats.push({
        'weekday' : (hourlyTaxiAvailabilityCountHash['8PM Mon'].concat(hourlyTaxiAvailabilityCountHash['8PM Tue']).concat(hourlyTaxiAvailabilityCountHash['8PM Wed']).concat(hourlyTaxiAvailabilityCountHash['8PM Thu']).concat(hourlyTaxiAvailabilityCountHash['8PM Fri'])),
        'weekend' : (hourlyTaxiAvailabilityCountHash['8PM Sat'].concat(hourlyTaxiAvailabilityCountHash['8PM Sun'])),
        'time' : '8PM'
      });
      // 9PM
      breakdownStats.push({
        'weekday' : (hourlyTaxiAvailabilityCountHash['9PM Mon'].concat(hourlyTaxiAvailabilityCountHash['9PM Tue']).concat(hourlyTaxiAvailabilityCountHash['9PM Wed']).concat(hourlyTaxiAvailabilityCountHash['9PM Thu']).concat(hourlyTaxiAvailabilityCountHash['9PM Fri'])),
        'weekend' : (hourlyTaxiAvailabilityCountHash['9PM Sat'].concat(hourlyTaxiAvailabilityCountHash['9PM Sun'])),
        'time' : '9PM'
      });
      // 10PM
      breakdownStats.push({
        'weekday' : (hourlyTaxiAvailabilityCountHash['10PM Mon'].concat(hourlyTaxiAvailabilityCountHash['10PM Tue']).concat(hourlyTaxiAvailabilityCountHash['10PM Wed']).concat(hourlyTaxiAvailabilityCountHash['10PM Thu']).concat(hourlyTaxiAvailabilityCountHash['10PM Fri'])),
        'weekend' : (hourlyTaxiAvailabilityCountHash['10PM Sat'].concat(hourlyTaxiAvailabilityCountHash['10PM Sun'])),
        'time' : '10PM'
      });
      // 11PM
      breakdownStats.push({
        'weekday' : (hourlyTaxiAvailabilityCountHash['11PM Mon'].concat(hourlyTaxiAvailabilityCountHash['11PM Tue']).concat(hourlyTaxiAvailabilityCountHash['11PM Wed']).concat(hourlyTaxiAvailabilityCountHash['11PM Thu']).concat(hourlyTaxiAvailabilityCountHash['11PM Fri'])),
        'weekend' : (hourlyTaxiAvailabilityCountHash['11PM Sat'].concat(hourlyTaxiAvailabilityCountHash['11PM Sun'])),
        'time' : '11PM'
      });
    } else if ($('#breakdown-stats-modal-label').html() == 'Off-peak Hours (10AM - 5PM)') {
      // 10AM
      breakdownStats.push({
        'weekday' : (hourlyTaxiAvailabilityCountHash['10AM Mon'].concat(hourlyTaxiAvailabilityCountHash['10AM Tue']).concat(hourlyTaxiAvailabilityCountHash['10AM Wed']).concat(hourlyTaxiAvailabilityCountHash['10AM Thu']).concat(hourlyTaxiAvailabilityCountHash['10AM Fri'])), 
        'weekend' : (hourlyTaxiAvailabilityCountHash['10AM Sat'].concat(hourlyTaxiAvailabilityCountHash['10AM Sun'])),
        'time' : '10AM'
      });
      // 11AM
      breakdownStats.push({
        'weekday' : (hourlyTaxiAvailabilityCountHash['11AM Mon'].concat(hourlyTaxiAvailabilityCountHash['11AM Tue']).concat(hourlyTaxiAvailabilityCountHash['11AM Wed']).concat(hourlyTaxiAvailabilityCountHash['11AM Thu']).concat(hourlyTaxiAvailabilityCountHash['11AM Fri'])),
        'weekend' : (hourlyTaxiAvailabilityCountHash['11AM Sat'].concat(hourlyTaxiAvailabilityCountHash['11AM Sun'])),
        'time' : '11AM'
      });
      // 12PM
      breakdownStats.push({
        'weekday' : (hourlyTaxiAvailabilityCountHash['12PM Mon'].concat(hourlyTaxiAvailabilityCountHash['12PM Tue']).concat(hourlyTaxiAvailabilityCountHash['12PM Wed']).concat(hourlyTaxiAvailabilityCountHash['12PM Thu']).concat(hourlyTaxiAvailabilityCountHash['12PM Fri'])),
        'weekend' : (hourlyTaxiAvailabilityCountHash['12PM Sat'].concat(hourlyTaxiAvailabilityCountHash['12PM Sun'])),
        'time' : '12PM'
      });
      // 1PM
      breakdownStats.push({
        'weekday' : (hourlyTaxiAvailabilityCountHash['1PM Mon'].concat(hourlyTaxiAvailabilityCountHash['1PM Tue']).concat(hourlyTaxiAvailabilityCountHash['1PM Wed']).concat(hourlyTaxiAvailabilityCountHash['1PM Thu']).concat(hourlyTaxiAvailabilityCountHash['1PM Fri'])),
        'weekend' : (hourlyTaxiAvailabilityCountHash['1PM Sat'].concat(hourlyTaxiAvailabilityCountHash['1PM Sun'])),
        'time' : '1PM'
      });
      // 2PM
      breakdownStats.push({
        'weekday' : (hourlyTaxiAvailabilityCountHash['2PM Mon'].concat(hourlyTaxiAvailabilityCountHash['2PM Tue']).concat(hourlyTaxiAvailabilityCountHash['2PM Wed']).concat(hourlyTaxiAvailabilityCountHash['2PM Thu']).concat(hourlyTaxiAvailabilityCountHash['2PM Fri'])),
        'weekend' : (hourlyTaxiAvailabilityCountHash['2PM Sat'].concat(hourlyTaxiAvailabilityCountHash['2PM Sun'])),
        'time' : '2PM'
      });
      // 3PM
      breakdownStats.push({
        'weekday' : (hourlyTaxiAvailabilityCountHash['3PM Mon'].concat(hourlyTaxiAvailabilityCountHash['3PM Tue']).concat(hourlyTaxiAvailabilityCountHash['3PM Wed']).concat(hourlyTaxiAvailabilityCountHash['3PM Thu']).concat(hourlyTaxiAvailabilityCountHash['3PM Fri'])),
        'weekend' : (hourlyTaxiAvailabilityCountHash['3PM Sat'].concat(hourlyTaxiAvailabilityCountHash['3PM Sun'])),
        'time' : '3PM'
      });
      // 4PM
      breakdownStats.push({
        'weekday' : (hourlyTaxiAvailabilityCountHash['4PM Mon'].concat(hourlyTaxiAvailabilityCountHash['4PM Tue']).concat(hourlyTaxiAvailabilityCountHash['4PM Wed']).concat(hourlyTaxiAvailabilityCountHash['4PM Thu']).concat(hourlyTaxiAvailabilityCountHash['4PM Fri'])),
        'weekend' : (hourlyTaxiAvailabilityCountHash['4PM Sat'].concat(hourlyTaxiAvailabilityCountHash['4PM Sun'])),
        'time' : '4PM'
      });
      // 5PM
      breakdownStats.push({
        'weekday' : (hourlyTaxiAvailabilityCountHash['5PM Mon'].concat(hourlyTaxiAvailabilityCountHash['5PM Tue']).concat(hourlyTaxiAvailabilityCountHash['5PM Wed']).concat(hourlyTaxiAvailabilityCountHash['5PM Thu']).concat(hourlyTaxiAvailabilityCountHash['5PM Fri'])),
        'weekend' : (hourlyTaxiAvailabilityCountHash['5PM Sat'].concat(hourlyTaxiAvailabilityCountHash['5PM Sun'])),
        'time' : '5PM'
      });
    } else if ($('#breakdown-stats-modal-label').html() == 'Off-peak Hours (12AM - 5AM)') {
      // 12AM
      breakdownStats.push({
        'weekday' : (hourlyTaxiAvailabilityCountHash['12AM Mon'].concat(hourlyTaxiAvailabilityCountHash['12AM Tue']).concat(hourlyTaxiAvailabilityCountHash['12AM Wed']).concat(hourlyTaxiAvailabilityCountHash['12AM Thu']).concat(hourlyTaxiAvailabilityCountHash['12AM Fri'])), 
        'weekend' : (hourlyTaxiAvailabilityCountHash['12AM Sat'].concat(hourlyTaxiAvailabilityCountHash['12AM Sun'])),
        'time' : '12AM'
      });
      // 1AM
      breakdownStats.push({
        'weekday' : (hourlyTaxiAvailabilityCountHash['1AM Mon'].concat(hourlyTaxiAvailabilityCountHash['1AM Tue']).concat(hourlyTaxiAvailabilityCountHash['1AM Wed']).concat(hourlyTaxiAvailabilityCountHash['1AM Thu']).concat(hourlyTaxiAvailabilityCountHash['1AM Fri'])),
        'weekend' : (hourlyTaxiAvailabilityCountHash['1AM Sat'].concat(hourlyTaxiAvailabilityCountHash['1AM Sun'])),
        'time' : '1AM'
      });
      // 2AM
      breakdownStats.push({
        'weekday' : (hourlyTaxiAvailabilityCountHash['2AM Mon'].concat(hourlyTaxiAvailabilityCountHash['2AM Tue']).concat(hourlyTaxiAvailabilityCountHash['2AM Wed']).concat(hourlyTaxiAvailabilityCountHash['2AM Thu']).concat(hourlyTaxiAvailabilityCountHash['2AM Fri'])),
        'weekend' : (hourlyTaxiAvailabilityCountHash['2AM Sat'].concat(hourlyTaxiAvailabilityCountHash['2AM Sun'])),
        'time' : '2AM'
      });
      // 3AM
      breakdownStats.push({
        'weekday' : (hourlyTaxiAvailabilityCountHash['3AM Mon'].concat(hourlyTaxiAvailabilityCountHash['3AM Tue']).concat(hourlyTaxiAvailabilityCountHash['3AM Wed']).concat(hourlyTaxiAvailabilityCountHash['3AM Thu']).concat(hourlyTaxiAvailabilityCountHash['3AM Fri'])),
        'weekend' : (hourlyTaxiAvailabilityCountHash['3AM Sat'].concat(hourlyTaxiAvailabilityCountHash['3AM Sun'])),
        'time' : '3AM'
      });
      // 4AM
      breakdownStats.push({
        'weekday' : (hourlyTaxiAvailabilityCountHash['4AM Mon'].concat(hourlyTaxiAvailabilityCountHash['4AM Tue']).concat(hourlyTaxiAvailabilityCountHash['4AM Wed']).concat(hourlyTaxiAvailabilityCountHash['4AM Thu']).concat(hourlyTaxiAvailabilityCountHash['4AM Fri'])),
        'weekend' : (hourlyTaxiAvailabilityCountHash['4AM Sat'].concat(hourlyTaxiAvailabilityCountHash['4AM Sun'])),
        'time' : '4AM'
      });
      // 5AM
      breakdownStats.push({
        'weekday' : (hourlyTaxiAvailabilityCountHash['5AM Mon'].concat(hourlyTaxiAvailabilityCountHash['5AM Tue']).concat(hourlyTaxiAvailabilityCountHash['5AM Wed']).concat(hourlyTaxiAvailabilityCountHash['5AM Thu']).concat(hourlyTaxiAvailabilityCountHash['5AM Fri'])),
        'weekend' : (hourlyTaxiAvailabilityCountHash['5AM Sat'].concat(hourlyTaxiAvailabilityCountHash['5AM Sun'])),
        'time' : '5AM'
      });
    }

    breakdownStatsSvg.append('text')
      .classed('breakdown-stats-header', true)
      .attr('x', 105)
      .attr('y', 20)
      .text('Overall')

    breakdownStatsSvg.append('text')
      .classed('breakdown-stats-header', true)
      .attr('x', 395)
      .attr('y', 20)
      .text('Weekdays')

    breakdownStatsSvg.append('text')
      .classed('breakdown-stats-header', true)
      .attr('x', 685)
      .attr('y', 20)
      .text('Weekends')

    var xBreakdownStats = d3.scaleLinear()
      .domain([0, 10000])
      .range([0, 220]);

    var xBreakdownStatsColorScale = d3.scaleLinear()
      .domain([0, 10000])
      .range(['#333', '#F4D03F']);

    for (var i=0; i < breakdownStats.length; i++) {
      var flattenOverallArray = [];

      breakdownStatsSvg.append('text')
        .classed('breakdown-stats-header', true)
        .attr('x', 40)
        .attr('y', 70 + (i * 60))
        .text(breakdownStats[i].time);

      breakdownStats[i].weekday.forEach(function(array) {
        flattenOverallArray = flattenOverallArray.concat(array);
      });

      breakdownStats[i].weekend.forEach(function(array) {
        flattenOverallArray = flattenOverallArray.concat(array);
      });
      
      // overall
      var sum = flattenOverallArray.reduce(function(a, b) { return a + b; });
      var avg = Math.round(sum / flattenOverallArray.length);
      var minRange = Math.min.apply(Math, flattenOverallArray);
      var maxRange = Math.max.apply(Math, flattenOverallArray);
      
      breakdownStatsSvg.append('line')
        .classed('bar-line', true)
        .attr('x1', 105)
        .attr('x2', 105)
        .attr('y1', 66 + (i*60))
        .attr('y2', 66 + (i*60))
        .attr('opacity', 0)
        .transition()
        .delay(50)
        .duration(200)
        .attr('opacity', 0.6)
        .attr('x2', 105 + xBreakdownStats(10000))
        .ease(d3.easeLinear)

      breakdownStatsSvg.append('line')
        .classed('bar-line', true)
        .attr('x1', 105)
        .attr('x2', 105)
        .attr('y1', 63 + (i*60))
        .attr('y2', 69 + (i*60))
        .attr('opacity', 0.6)

      breakdownStatsSvg.append('line')
        .classed('bar-line', true)
        .attr('x1', 105 + xBreakdownStats(10000))
        .attr('x2', 105 + xBreakdownStats(10000))
        .attr('y1', 63 + (i*60))
        .attr('y2', 69 + (i*60))
        .attr('opacity', 0)
        .transition()
        .delay(250)
        .duration(50)
        .attr('opacity', 0.6)
        .ease(d3.easeLinear)

      breakdownStatsSvg.append('rect')
        .classed('horizontal-bar', true)
        .attr('x', 125 + xBreakdownStats(minRange))
        .attr('y', 60 + (i*60))
        .attr('rx', 2)
        .attr('ry', 2)
        .attr('height', 12)
        .attr('width', 0)
        .transition()
        .delay(250)
        .duration(300)
        .attr('width', xBreakdownStats(maxRange) - xBreakdownStats(minRange))
        .style('fill', xBreakdownStatsColorScale(maxRange))
        .ease(d3.easeLinear)

      breakdownStatsSvg.append('circle')
        .classed('horizontal-bar-circle', true)
        .attr('cx', 125 + xBreakdownStats(avg))
        .attr('cy', 66 + (i*60))
        .attr("r", 3)
        .attr('opacity', 0)
        .transition()
        .delay(700)
        .duration(200)
        .attr('opacity', 1)
        .ease(d3.easeLinear)

      breakdownStatsSvg.append('text')
        .classed('horizontal-bar-value-left', true)
        .attr('x', 125 + xBreakdownStats(minRange))
        .attr('dx', -20)
        .attr('y', 85 + (i*60))
        .attr('opacity', 0)
        .text(minRange)
        .transition()
        .delay(500)
        .duration(300)
        .attr('opacity', 1)
        .ease(d3.easeLinear)

      breakdownStatsSvg.append('text')
        .classed('horizontal-bar-value-right', true)
        .attr('x', 125 + xBreakdownStats(maxRange))
        .attr('y', 85 + (i*60))
        .attr('opacity', 0)
        .text(maxRange)
        .transition()
        .delay(500)
        .duration(300)
        .attr('opacity', 1)
        .ease(d3.easeLinear)

      breakdownStatsSvg.append('text')
        .classed('horizontal-bar-value', true)
        .attr('x', 125 + xBreakdownStats(avg))
        .attr('y', 85 + (i*60))
        .attr('dy', -30)
        .attr('opacity', 0)
        .text(avg)
        .transition()
        .delay(500)
        .duration(300)
        .attr('opacity', 1)
        .ease(d3.easeLinear)

      // weekday
      var weekdaySum = breakdownStats[i].weekday.reduce(function(a, b) { return a + b; });
      var weekdayAvg = Math.round(weekdaySum / breakdownStats[i].weekday.length);
      var weekdayMinRange = Math.min.apply(Math, breakdownStats[i].weekday);
      var weekdayMaxRange = Math.max.apply(Math, breakdownStats[i].weekday);
      
      breakdownStatsSvg.append('line')
        .classed('bar-line', true)
        .attr('x1', 395)
        .attr('x2', 395)
        .attr('y1', 66 + (i*60))
        .attr('y2', 66 + (i*60))
        .attr('opacity', 0)
        .transition()
        .delay(50)
        .duration(200)
        .attr('opacity', 0.6)
        .attr('x2', 395 + xBreakdownStats(10000))
        .ease(d3.easeLinear)

      breakdownStatsSvg.append('line')
        .classed('bar-line', true)
        .attr('x1', 395)
        .attr('x2', 395)
        .attr('y1', 63 + (i*60))
        .attr('y2', 69 + (i*60))
        .attr('opacity', 0.6)

      breakdownStatsSvg.append('line')
        .classed('bar-line', true)
        .attr('x1', 395 + xBreakdownStats(10000))
        .attr('x2', 395 + xBreakdownStats(10000))
        .attr('y1', 63 + (i*60))
        .attr('y2', 69 + (i*60))
        .attr('opacity', 0)
        .transition()
        .delay(250)
        .duration(50)
        .attr('opacity', 0.6)
        .ease(d3.easeLinear)

      breakdownStatsSvg.append('rect')
        .classed('horizontal-bar', true)
        .attr('x', 415 + xBreakdownStats(weekdayMinRange))
        .attr('y', 60 + (i*60))
        .attr('rx', 2)
        .attr('ry', 2)
        .attr('height', 12)
        .attr('width', 0)
        .transition()
        .delay(250)
        .duration(300)
        .attr('width', xBreakdownStats(weekdayMaxRange) - xBreakdownStats(weekdayMinRange))
        .style('fill', xBreakdownStatsColorScale(weekdayMaxRange))
        .ease(d3.easeLinear)

      breakdownStatsSvg.append('circle')
        .classed('horizontal-bar-circle', true)
        .attr('cx', 415 + xBreakdownStats(weekdayAvg))
        .attr('cy', 66 + (i*60))
        .attr("r", 3)
        .attr('opacity', 0)
        .transition()
        .delay(700)
        .duration(200)
        .attr('opacity', 1)
        .ease(d3.easeLinear)

      breakdownStatsSvg.append('text')
        .classed('horizontal-bar-value-left', true)
        .attr('x', 415 + xBreakdownStats(weekdayMinRange))
        .attr('dx', -20)
        .attr('y', 85 + (i*60))
        .attr('opacity', 0)
        .text(weekdayMinRange)
        .transition()
        .delay(500)
        .duration(300)
        .attr('opacity', 1)
        .ease(d3.easeLinear)

      breakdownStatsSvg.append('text')
        .classed('horizontal-bar-value-right', true)
        .attr('x', 415 + xBreakdownStats(weekdayMaxRange))
        .attr('y', 85 + (i*60))
        .attr('opacity', 0)
        .text(weekdayMaxRange)
        .transition()
        .delay(500)
        .duration(300)
        .attr('opacity', 1)
        .ease(d3.easeLinear)

      breakdownStatsSvg.append('text')
        .classed('horizontal-bar-value', true)
        .attr('x', 415 + xBreakdownStats(weekdayAvg))
        .attr('y', 85 + (i*60))
        .attr('dy', -30)
        .attr('opacity', 0)
        .text(weekdayAvg)
        .transition()
        .delay(500)
        .duration(300)
        .attr('opacity', 1)
        .ease(d3.easeLinear)

      // weekend
      var weekendSum = breakdownStats[i].weekend.reduce(function(a, b) { return a + b; });
      var weekendAvg = Math.round(weekendSum / breakdownStats[i].weekend.length);
      var weekendMinRange = Math.min.apply(Math, breakdownStats[i].weekend);
      var weekendMaxRange = Math.max.apply(Math, breakdownStats[i].weekend);
      
      breakdownStatsSvg.append('line')
        .classed('bar-line', true)
        .attr('x1', 685)
        .attr('x2', 685)
        .attr('y1', 66 + (i*60))
        .attr('y2', 66 + (i*60))
        .attr('opacity', 0)
        .transition()
        .delay(50)
        .duration(200)
        .attr('opacity', 0.6)
        .attr('x2', 685 + xBreakdownStats(10000))
        .ease(d3.easeLinear)

      breakdownStatsSvg.append('line')
        .classed('bar-line', true)
        .attr('x1', 685)
        .attr('x2', 685)
        .attr('y1', 63 + (i*60))
        .attr('y2', 69 + (i*60))
        .attr('opacity', 0.6)

      breakdownStatsSvg.append('line')
        .classed('bar-line', true)
        .attr('x1', 685 + xBreakdownStats(10000))
        .attr('x2', 685 + xBreakdownStats(10000))
        .attr('y1', 63 + (i*60))
        .attr('y2', 69 + (i*60))
        .attr('opacity', 0)
        .transition()
        .delay(250)
        .duration(50)
        .attr('opacity', 0.6)
        .ease(d3.easeLinear)

      breakdownStatsSvg.append('rect')
        .classed('horizontal-bar', true)
        .attr('x', 705 + xBreakdownStats(weekendMinRange))
        .attr('y', 60 + (i*60))
        .attr('rx', 2)
        .attr('ry', 2)
        .attr('height', 12)
        .attr('width', 0)
        .transition()
        .delay(250)
        .duration(300)
        .attr('width', xBreakdownStats(weekendMaxRange) - xBreakdownStats(weekendMinRange))
        .style('fill', xBreakdownStatsColorScale(weekendMaxRange))
        .ease(d3.easeLinear)

      breakdownStatsSvg.append('circle')
        .classed('horizontal-bar-circle', true)
        .attr('cx', 705 + xBreakdownStats(weekendAvg))
        .attr('cy', 66 + (i*60))
        .attr("r", 3)
        .attr('opacity', 0)
        .transition()
        .delay(700)
        .duration(200)
        .attr('opacity', 1)
        .ease(d3.easeLinear)

      breakdownStatsSvg.append('text')
        .classed('horizontal-bar-value-left', true)
        .attr('x', 705 + xBreakdownStats(weekendMinRange))
        .attr('dx', -20)
        .attr('y', 85 + (i*60))
        .attr('opacity', 0)
        .text(weekendMinRange)
        .transition()
        .delay(500)
        .duration(300)
        .attr('opacity', 1)
        .ease(d3.easeLinear)

      breakdownStatsSvg.append('text')
        .classed('horizontal-bar-value-right', true)
        .attr('x', 705 + xBreakdownStats(weekendMaxRange))
        .attr('y', 85 + (i*60))
        .attr('opacity', 0)
        .text(weekendMaxRange)
        .transition()
        .delay(500)
        .duration(300)
        .attr('opacity', 1)
        .ease(d3.easeLinear)

      breakdownStatsSvg.append('text')
        .classed('horizontal-bar-value', true)
        .attr('x', 705 + xBreakdownStats(weekendAvg))
        .attr('y', 85 + (i*60))
        .attr('dy', -30)
        .attr('opacity', 0)
        .text(weekendAvg)
        .transition()
        .delay(500)
        .duration(300)
        .attr('opacity', 1)
        .ease(d3.easeLinear)
    }

    breakdownStatsSvg
      .attr('width', 950)
      .attr('height',  60 + (breakdownStats.length * 60));
  })
});