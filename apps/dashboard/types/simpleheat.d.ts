declare module "simpleheat" {
  interface SimpleHeat {
    data(data: [number, number, number][]): this;
    max(val: number): this;
    radius(r: number, blur?: number): this;
    gradient(grad: Record<number, string>): this;
    draw(minOpacity?: number): this;
  }
  function simpleheat(canvas: HTMLCanvasElement): SimpleHeat;
  export default simpleheat;
}
