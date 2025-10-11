import type { Geometry } from "@/components/Map/historical/types";
import type { LocationInfo_Mapbook } from "./mapbook";
import type { LocationInfo_OpenStreetMap } from "./openstreetmap";
import type { LocationInfo_SHLibrary } from "./shlibrary";
import type { LocationInfo_VirtualShanghai } from "./virtualshanghai";
import type { LocationInfo_Wikidata } from "./wikidata";

export interface CommonFields {
  name: string;
  oldNames?: string[];
  address?: string;
  description?: string;

  wikipedia?: string;
  wikidata?: string;
  wikicommons?: string;

  subtypeId: string;

  properties: any;

  coordinates?: [number, number];
  geometry?: Geometry;
}

export type LocationInfo =
  | LocationInfo_OpenStreetMap
  | LocationInfo_Mapbook
  | LocationInfo_VirtualShanghai
  | LocationInfo_SHLibrary
  | LocationInfo_Wikidata;
