import { z } from "zod";

import { BehavioralEventNames } from "../../../types/event.js";

const shareChannelSchema = z.enum([
  "whatsapp",
  "tiktok",
  "copy_link",
  "other",
]);

const storeSharedSchema = z.object({
  name: z.literal(BehavioralEventNames.STORE_SHARED),
  storeId: z.string().min(1),
  eventKey: z.string().min(1).max(255).optional(),
  metadata: z.object({
    channel: shareChannelSchema,
  }).strict(),
}).strict();

const productSharedSchema = z.object({
  name: z.literal(BehavioralEventNames.PRODUCT_SHARED),
  storeId: z.string().min(1),
  productId: z.string().min(1),
  eventKey: z.string().min(1).max(255).optional(),
  metadata: z.object({
    channel: shareChannelSchema,
  }).strict(),
}).strict();

const searchPerformedSchema = z.object({
  name: z.literal(BehavioralEventNames.SEARCH_PERFORMED),
  eventKey: z.string().min(1).max(255).optional(),
  metadata: z.object({
    query: z.string().trim().min(1),
    results_count: z.number().int().nonnegative(),
  }).strict(),
}).strict();

const checkoutValidationFailedSchema = z.object({
  name: z.literal(BehavioralEventNames.CHECKOUT_VALIDATION_FAILED),
  storeId: z.string().min(1),
  eventKey: z.string().min(1).max(255).optional(),
  metadata: z.object({
    field: z.enum([
      "buyer_name",
      "phone",
      "delivery_city",
      "delivery_address",
    ]),
    reason: z.string().trim().min(1),
  }).strict(),
}).strict();

const storeViewedSchema = z.object({
  name: z.literal(BehavioralEventNames.STORE_VIEWED),
  storeId: z.string().min(1),
  eventKey: z.string().min(1).max(255).optional(),
}).strict();

const productViewedSchema = z.object({
  name: z.literal(BehavioralEventNames.PRODUCT_VIEWED),
  storeId: z.string().min(1),
  productId: z.string().min(1),
  eventKey: z.string().min(1).max(255).optional(),
}).strict();

const categoryViewedSchema = z.object({
  name: z.literal(BehavioralEventNames.CATEGORY_VIEWED),
  eventKey: z.string().min(1).max(255).optional(),
}).strict();

const cartViewedSchema = z.object({
  name: z.literal(BehavioralEventNames.CART_VIEWED),
  storeId: z.string().min(1).optional(),
  eventKey: z.string().min(1).max(255).optional(),
}).strict();

const checkoutStartedSchema = z.object({
  name: z.literal(BehavioralEventNames.CHECKOUT_STARTED),
  storeId: z.string().min(1),
  eventKey: z.string().min(1).max(255).optional(),
}).strict();

const checkoutSubmittedSchema = z.object({
  name: z.literal(BehavioralEventNames.CHECKOUT_SUBMITTED),
  storeId: z.string().min(1),
  eventKey: z.string().min(1).max(255).optional(),
}).strict();

export const createEventSchema = z.discriminatedUnion("name", [
  storeViewedSchema,
  storeSharedSchema,
  productViewedSchema,
  productSharedSchema,
  categoryViewedSchema,
  searchPerformedSchema,
  cartViewedSchema,
  checkoutStartedSchema,
  checkoutSubmittedSchema,
  checkoutValidationFailedSchema,
]);

export type CreateEventBody = z.infer<typeof createEventSchema>;
