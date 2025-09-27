import { LocationInfo_OpenStreetMap } from "./openstreetmap";
import { LocationInfo_Mapbook } from "./mapbook";
import { LocationInfo_VirtualShanghai } from "./virtualshanghai";
import { LocationInfo_SHLibrary } from "./shlibrary";
import { LocationInfo_Wikidata } from "./wikidata";

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
}

export type LocationInfo =
  | LocationInfo_OpenStreetMap
  | LocationInfo_Mapbook
  | LocationInfo_VirtualShanghai
  | LocationInfo_SHLibrary
  | LocationInfo_Wikidata;
