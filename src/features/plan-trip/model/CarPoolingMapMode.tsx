export type CarPoolingMapMode = CarPoolingMapModes[keyof CarPoolingMapModes];

export interface CarPoolingMapModes {
  Drawing: "drawing";
  Editing: "editing";
  Viewing: "viewing";
}
