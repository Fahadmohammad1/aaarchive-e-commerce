"use client";

import { useMutation } from "@tanstack/react-query";
import { placeOrder, trackOrder } from "./order-store-api";

export function usePlaceOrder() {
  return useMutation({ mutationFn: placeOrder });
}

/** Tracking is a POST (phone + number), used like a lookup. */
export function useTrackOrder() {
  return useMutation({ mutationFn: trackOrder });
}
