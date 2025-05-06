export type Name = {
  value: string;
};

export type StopPlace = {
  id: string;
  name: Name;
};

export type StopPlaceData = {
  stopPlace: [StopPlace];
};

export type StopPlaceContext = {
  data: StopPlaceData;
};
