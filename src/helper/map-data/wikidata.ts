import { CommonFields, LocationInfo } from "./LocationInfo";

export type LocationInfo_Wikidata = CommonFields & {
  dataSource: "Wikidata";
};

export const getWikidataLocationInfo = (
  props: any,
  subtypeId: string
): LocationInfo => {
  return {
    dataSource: "Wikidata",
    name: props.itemLabel,
    description: props.itemDescription,
    wikipedia: props.zhwiki_url,
    wikidata: props.item,
    wikicommons: props.commons_url,
    subtypeId,
    properties: props,
  };
};
