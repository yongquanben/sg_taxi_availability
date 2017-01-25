/// <reference types="d3" />

declare namespace sentio {

	namespace internal {

		interface Margin {
			top: number,
			right: number,
			bottom: number,
			left: number
		}

		type SimpleFn<T> = () => T;
		type ObjectFn<T> = (d: any) => T;
		type ObjectIndexFn<T> = (d: any, i: number) => T;
		type UnionFn<T> = SimpleFn<T> | ObjectFn<T> | ObjectIndexFn<T>;

		type BinSimpleFn<T> = (bin: any) => T;
		type BinObjectFn<T> = (bin: any, d: any) => T;
		type BinObjectIndexFn<T> = (bin: any, d: any, i: number) => T;
		type BinUnionFn<T> = BinSimpleFn<T> | BinObjectFn<T> | BinObjectIndexFn<T>;

		interface BaseChart {
			margin(): Margin;
			margin(v: Margin): this;

			data(): any[];
			data(v? : any[]): this;

			init(container: any): this;
			resize(): this;
			redraw(): this;
		}

		interface DurationChart {
			duration(): number;
			duration(v: number): this;
		}

		interface MultiSeriesChart {
			seriesKey(): UnionFn<string | number>;
			seriesKey(v: UnionFn<string | number>): this;

			seriesValues(): UnionFn<any[]>;
			seriesValues(v: UnionFn<any[]>): this;

			seriesLabel(): UnionFn<string>;
			seriesLabel(v: UnionFn<string>): this;
		}

		interface KeyValueChart {
			key(): UnionFn<string | number>;
			key(v: UnionFn<string | number>): this;

			value(): UnionFn<any>;
			value(v: UnionFn<any>): this;
		}
		interface LabelChart {
			label(): UnionFn<string>;
			label(v: UnionFn<string>): this;
		}

		interface WidthChart {
			width(): number;
			width(v: number): this;
		}
		interface HeightChart {
			height(): number;
			height(v: number): this;
		}

	}

	/*
	 * Charts
	 */
	namespace chart {

		export interface DonutChart
			extends internal.BaseChart, internal.DurationChart, internal.HeightChart,
				internal.LabelChart, internal.KeyValueChart, internal.WidthChart {

			innerRadiusRatio(): number;
			innerRadiusRatio(v: number): this;

			colorScale(): any;
			colorScale(v: any): this;

			dispatch(): any;

			legend(): DonutChartLegendConfig;
		}
		export interface DonutChartLegendConfig {
			enabled: boolean,
			markSize: number,
			markMargin: number,
			labelOffset: number,
			position: string,
			layout: string
		}
		export function donut(): DonutChart;


		export interface MatrixChart
			extends internal.BaseChart, internal.DurationChart, internal.KeyValueChart,
				internal.MultiSeriesChart {

			cellSize(): number;
			cellSize(v: number): this;

			cellMargin(): number;
			cellMargin(v: number): this;

			colorScale(): any;
			colorScale(v: any): this;

			xScale(): any;
			xScale(v: any): this;

			yScale(): any;
			yScale(v: any): this;

			xExtent(): model.Extent;
			xExtent(v: model.Extent): this;

			valueExtent(): model.Extent;
			valueExtent(v: model.Extent): this;

			dispatch(): any;
		}
		export function matrix(): MatrixChart;


		export interface VerticalBarsChart
			extends internal.BaseChart, internal.DurationChart, internal.WidthChart,
				internal.KeyValueChart, internal.LabelChart, internal.DurationChart {

			barHeight(): number;
			barHeight(v: number): this;

			barPadding(): number;
			barPadding(v: number): this;

			widthExtent(): model.Extent;
			widthExtent(v: model.Extent): this;

			dispatch(): any;
		}
		export function verticalBars(): VerticalBarsChart;


		export interface TimelineChart
			extends internal.BaseChart, internal.HeightChart, internal.MultiSeriesChart,
				internal.WidthChart {

			curve(): any;
			curve(v: any): this;

			xAxis(): any;
			xAxis(v: any): this;

			yAxis(): any;
			yAxis(v: any): this;

			xScale(): any;
			xScale(v: any): this;

			yScale(): any;
			yScale(v: any): this;

			xValue(): any;
			xValue(v: any): this;

			yValue(): any;
			yValue(v: any): this;

			xExtent(): model.Extent;
			xExtent(v: model.Extent): this;

			yExtent(): model.Extent;
			yExtent(v: model.Extent): this;

			markers(): any[];
			markers(v: any[]): this;

			markerXValue(): internal.UnionFn<number>;
			markerXValue(v: internal.UnionFn<number>): this;

			markerLabel(): internal.UnionFn<string | number>;
			markerLabel(v: internal.UnionFn<string | number>): this;

			filter(): boolean;
			filter(v: boolean): this;

			setFilter(v?: [number, number] | null): this;
			getFilter(): [number, number] | null;

			dispatch(): any;
		}
		export function timeline(): TimelineChart;

		export interface RealtimeTimelineChart extends TimelineChart {
			start(): void;
			stop(): void;
			restart(): void;

			interval(): number;
			interval(v: number): this;

			delay(): number;
			delay(v: number): this;

			fps(): number;
			fps(v: number): this;
		}
		export function realtimeTimeline(): RealtimeTimelineChart;
	}

	/*
	 * Controller package
	 */
	namespace controller {

		export interface RealtimeBinsController {

			model(): model.BinsModel;
			bins(): any[];
			start(): this;
			stop(): this;
			running(): boolean;
			add(v: any): this;
			clear(): this;

			binsize(): number;
			binSize(v: number): this;

			binCount(): number;
			binCount(v: number): this;

		}
		export interface RealtimeBinsControllerConfig {
			delay?: number,
			binSize: number,
			binCount: number
		}
		export function realtimeBins(config?: RealtimeBinsControllerConfig): RealtimeBinsController;

		export interface TimelineBrush {
			scale(): any;
			scale(v: any): this;

			brush(): any;

			enabled(): boolean;
			enabled(v: boolean): this;

			getSelection(node: any): any;
			setSelection(group: any, v: any): void;
		}
		export interface TimelineBrushConfig {
			scale: any;
			brush: any;
		}
		export function timelineBrush(config: TimelineBrushConfig): TimelineBrush;

	}

	/*
	 * Model package
	 */
	namespace model {

		export interface BinsModel {
			set(data: any[]): this;
			clear(): this;
			add(v: any): this;
			lwm(v: number): this;
			hwm(v: number): this;

			getKey(): internal.UnionFn<string | number>;
			getKey(v: internal.UnionFn<string | number>): this;

			getValue(): internal.UnionFn<any>;
			getValue(v: internal.UnionFn<any>): this;

			updateBin(): internal.BinUnionFn<void>;
			updateBin(v: internal.BinUnionFn<void>): this;

			createSeed(): () => any;
			createSeed(v: () => any): this;

			countBin(): (bin: any) => number;
			countBin(v: (bin: any) => number): this;

			afterAdd(): (bins: any[], currentcount: number, previousCount: number) => void;
			afterAdd(v: (bins: any[], currentcount: number, previousCount: number) => void): this;

			afterUpdate(): (bins: any[], currentcount: number, previousCount: number) => void;
			afterUpdate(v: (bins: any[], currentcount: number, previousCount: number) => void): this;

			size(): number;
			size(v: number): this;

			count(): number;
			count(v: number): this;

			bins(): any[];

			itemCount(): number;

			clearBin(i: number): number;
		}
		export interface BinsModelConfig {
			count: number,
			size: number,
			lwm: number,

			createSeed?: () => any,
			getKey?: internal.UnionFn<string | number>,
			getValue?: internal.UnionFn<any>,
			updateBin?: internal.BinUnionFn<void>,
			countBin?: (bin: any) => number,
			afterAdd?: (bins: any[], currentcount: number, previousCount: number) => void,
			afterUpdate?: (bins: any[], currentcount: number, previousCount: number) => void
		}
		export function bins(config?: BinsModelConfig): BinsModel;

		/**
		 * Extent utility. Adds convenience for things like default values, clamping,
		 * and dynamic element filtering.
		 *
		 * @param config
		 */
		export interface Extent {

			/**
			 * Get the default value
			 */
			defaultValue(): [ number, number ];

			/**
			 * Set the default value, which is used when an extent cannot be derived from the data
			 */
			defaultValue(v: [ number, number ]): this;

			/**
			 * Get the override value
			 */
			overrideValue(): [ number, number ];

			/**
			 * Set the override value, which is applied on top of the derived extent.
			 *     'undefined' for either value in the tuple means that element won't be overridden
			 *     If override is [0, 5], the extent will always be [0, 5]
			 *     If override is [undefined, 5], and the extent is [1, 10] the extent will be [1, 5]
			 *     Default override is [undefined, undefined], which means don't override either value
			 */
			overrideValue(v: [ number, number ]): this;

			/**
			 * Get the 'getValue' accessor function
			 */
			getValue(): internal.UnionFn<number>;

			/**
			 * Set the 'setValue' accessor function, which is used to teach the extent utility how to
			 * get the value from the data array.
			 * @param v
			 */
			getValue(v: internal.UnionFn<number>): this;

			/**
			 * Get the 'filter' function
			 */
			filter(): internal.UnionFn<boolean>;

			/**
			 * Set the 'filter' function, which is used to omit elements from the data array when calculating
			 * the extent
			 */
			filter(v: internal.UnionFn<boolean>): this;

			/**
			 * Get the extent given the data array and the current configuration of the extent utility
			 * @param data
			 */
			getExtent(data: any[]): [ number, number ];

		}

		/**
		 * Extent Configuration object
		 */
		export class ExtentConfig {
			defaultValue?: [ number, number ];
			overrideValue?: [ number, number ];
			getValue?: internal.UnionFn<number>;
			filter?: internal.UnionFn<boolean>;
		}

		/**
		 * Factory method to create an {{Extent}}
		 * @param config
		 */
		export function extent(config?: ExtentConfig): Extent;


		/**
		 * Multi-Extent Utility. This is a utility for deriving the extent of multiple data arrays at once
		 * The effective extent is the
		 */
		export interface MultiExtent {
			extent(): Extent;
			extent(v: Extent): this;

			values(): (v: any) => any[];
			values(v: (v: any) => any[]): this;

			getExtent(data: any[]): [ number, number ];
		}
		export interface MultiExtentConfig {
			extent?: Extent;
		}
		export function multiExtent(config?: MultiExtentConfig): MultiExtent;

	}

}

export = sentio;
