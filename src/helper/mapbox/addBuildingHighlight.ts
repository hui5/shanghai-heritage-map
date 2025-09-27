export const addBuildingHighlight = (map: mapboxgl.Map) => {
  map.addInteraction("building-mouseenter", {
    type: "mouseenter",
    target: { featuresetId: "buildings", importId: "basemap" },
    handler: (e) => {
      if (e.feature) {
        map.setFeatureState(e.feature, {
          highlight: true,
        });

        const osmId = e.feature.id;
        if (osmId) {
          const q = `[out:json];way(${osmId});out tags center;`;
          const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(
            q
          )}`;
          // console.log(url);
        }
      }
    },
  });

  map.addInteraction("building-mouseleave", {
    type: "mouseleave",
    target: { featuresetId: "buildings", importId: "basemap" },
    handler: (e) => {
      if (e.feature) {
        map.setFeatureState(e.feature, {
          highlight: false,
        });
      }

      return false;
    },
  });
};
