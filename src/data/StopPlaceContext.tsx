export type Name = {
  value: string;
};

export type StopPlace = {
  id: string;
  name: Name;
  geometry: {
    legacyCoordinates: [number, number][];
  };
  stopPlaceType: string;
};

export type StopPlaceData = {
  stopPlace: StopPlace[];
};

export type StopPlaceContext = {
  data: StopPlaceData;
};
