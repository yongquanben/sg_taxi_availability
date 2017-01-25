# 3.0 (January 2017)

## New package structure
In Sentio 3.0, we consolidated everything into the following packages (several elements were renamed to a consistent scheme in the process):

 * ```sentio.chart```
    * donut
    * matrix
    * verticalBars

 * ```sentio.chart.timeline```
    * timeline (formerly sentio.timeline.line)
    * realtimeTimeline (formerly sentio.realtime.timeline)

 * ```sentio.controller```
    * realtimeBins
    * timelineBrush
    
 * ```sentio.model```
    * bins
    * extent
    * multiExtent



## Donut Chart
 * The ```color``` property was renamed to ```colorScale``` for consistency and clarity.
 * Events now consistently return the data element as the event object.

## Matrix Chart
 * Removed yExtent function since there is no y extent

## Vertical Bars Chart
 * Got rid of margin cause it isn't needed, you should use CSS
 * 

## Timeline
 * Moved from ```sentio.timeline.line``` to ```sentio.chart.timeline```
 * You can now override the accessors for the series, values, and markers
 * ```timeline.markerLabelValue``` is now ```timeline.markerLabel```
 * The default access for the top-level data series previously assumed a data structure of ```{ key: string|number, label: string|number, data: any[]}```. To be consistent with other charts with multiple series, it now assumes the default data structure is ```{ key: string | number, label: string | number, values: any[] }```

## Realtime Timeline 
 * Moved from ```sentio.realtime.timeline``` to ```sentio.chart.realtimeTimeline```

## Realtime Bins Controller
 * ```rtBins``` renamed to ```realtimeBins```
 
