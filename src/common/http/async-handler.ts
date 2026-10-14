import type {
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from "express";

export function asyncHandler<
 Params = {},
 ResBody = unknown,
 ReqBody = {},
 ReqQuery = {},
>(
  handler: (
    req: Request<Params, ResBody, ReqBody, ReqQuery>,
    res: Response<ResBody>,
    next: NextFunction,
  ) => Promise<void> | void,
): RequestHandler<Params, ResBody, ReqBody, ReqQuery> {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
