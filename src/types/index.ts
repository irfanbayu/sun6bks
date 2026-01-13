// SUN 6 BKS Type Definitions

export type Event = {
  id: number;
  title: string;
  date: string;
  venue: string;
  performers: string[];
  price: string;
  map: {
    lat: number;
    lng: number;
  };
  adminOnly?: boolean;
};

export type Performer = {
  id: number;
  name: string;
  bio?: string;
  image?: string;
};

export type Venue = {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
};
