// proxy image

// https://images.weserv.nl/?url=//upload.wikimedia.org/wikipedia/commons/4/4b/Map_of_USA_NC.svg

export const proxyImage = (url: string, width?: number) =>
  width
    ? `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=${width}`
    : `https://images.weserv.nl/?url=${encodeURIComponent(url)}`;
