declare module 'chart.js' {
  // Define enough types to satisfy the compiler and linter
  export interface ChartInstance {
    data: {
      labels: string[];
      datasets: {
        label: string;
        data: number[];
        backgroundColor: string;
        borderColor: string;
        borderWidth: number;
        pointBackgroundColor?: string;
        borderDash?: number[];
        pointRadius?: number;
      }[];
    };
    update(mode?: string): void;
    destroy(): void;
  }

  export interface ChartStatic {
    new (ctx: CanvasRenderingContext2D | HTMLCanvasElement, config: unknown): ChartInstance;
    register(...args: unknown[]): void;
  }

  export const Chart: ChartStatic;
  export const RadarController: unknown;
  export const RadialLinearScale: unknown;
  export const PointElement: unknown;
  export const LineElement: unknown;
  export const Filler: unknown;
  export const Legend: unknown;
  export const Tooltip: unknown;
  const _default: unknown;
  export default _default;
}
