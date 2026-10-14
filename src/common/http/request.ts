import type { Request } from "express";

export type HttpRequest<
  Params = {},
  Body = {},
  Query = {},
> = Request<Params, unknown, Body, Query>;
