import * as server from "./server.js";
export const queryCollection = (event, collection) => {
  return server.queryCollection(event, collection);
};
export const queryCollectionNavigation = server.queryCollectionNavigation;
export const queryCollectionItemSurroundings = server.queryCollectionItemSurroundings;
export const queryCollectionSearchSections = server.queryCollectionSearchSections;
