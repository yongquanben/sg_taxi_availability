import { donut } from './donut';
import { matrix } from './matrix';
import { timeline } from './timeline/timeline';
import { realtimeTimeline } from './timeline/realtime-timeline';
import { verticalBars } from './vertical-bars';

var chart = {
	donut: donut,
	matrix: matrix,
	realtimeTimeline: realtimeTimeline,
	timeline: timeline,
	verticalBars: verticalBars
};

export { chart };
