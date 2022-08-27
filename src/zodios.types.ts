import express from "express";
import { ZodiosEnpointDescriptions, EndpointError } from "@zodios/core";
import { IfEquals } from "@zodios/core/lib/utils.types";
import {
  Response,
  QueryParams,
  Body,
  Paths,
  PathParams,
  Method,
} from "@zodios/core/lib/zodios.types";

type SucessCodes = 200 | 201 | 202 | 203 | 204 | 205 | 206 | 207 | 208 | 226;

export interface RequestHandler<
  Api extends ZodiosEnpointDescriptions,
  M extends Method,
  Path extends Paths<Api, M>,
  ReqPath = PathParams<Path>,
  ReqBody = Body<Api, M, Path>,
  ReqQuery = QueryParams<Api, M, Path>,
  Res = Response<Api, M, Path>
> {
  (
    req: express.Request<ReqPath, Res, ReqBody, ReqQuery>,
    res: Omit<express.Response<Res>, "status"> & {
      // rebind context to allow for type inference
      status<
        StatusCode extends number,
        API extends unknown[] = Api,
        METHOD extends Method = M,
        PATH = Path
      >(
        status: StatusCode
      ): StatusCode extends SucessCodes
        ? express.Response<Res>
        : express.Response<EndpointError<API, METHOD, PATH, StatusCode>>;
    },
    next: express.NextFunction
  ): void;
}

export type ZodiosHandler<
  Router,
  Api extends ZodiosEnpointDescriptions,
  M extends Method
> = <Path extends Paths<Api, M>>(
  path: Path,
  ...handlers: Array<RequestHandler<Api, M, Path>>
) => Router;

export interface ZodiosUse {
  use(...handlers: Array<ZodiosHandlers<any>>): this;
  use(handlers: Array<ZodiosHandlers<any>>): this;
  use(path: string, ...handlers: Array<ZodiosHandlers<any>>): this;
  use(path: string, handlers: Array<ZodiosHandlers<any>>): this;
}

export interface ZodiosHandlers<Api extends ZodiosEnpointDescriptions>
  extends ZodiosUse {
  get: ZodiosHandler<this, Api, "get">;
  post: ZodiosHandler<this, Api, "post">;
  put: ZodiosHandler<this, Api, "put">;
  patch: ZodiosHandler<this, Api, "patch">;
  delete: ZodiosHandler<this, Api, "delete">;
  options: ZodiosHandler<this, Api, "options">;
  head: ZodiosHandler<this, Api, "head">;
}

export interface ZodiosValidationOptions {
  /**
   * validate request parameters - default is true
   */
  validate?: boolean;
  /**
   * transform request parameters - default is false
   */
  transform?: boolean;
}

export interface ZodiosAppOptions extends ZodiosValidationOptions {
  /**
   * express app intance - default is express()
   */
  express?: ReturnType<typeof express>;
}

export interface ZodiosRouterOptions extends ZodiosValidationOptions {
  /**
   * express router instance - default is express.Router
   */
  router?: ReturnType<typeof express.Router>;
}

export type ZodiosApp<Api extends ZodiosEnpointDescriptions> = IfEquals<
  Api,
  any,
  ReturnType<typeof express> & ZodiosUse,
  Omit<ReturnType<typeof express.Router>, Method> & ZodiosHandlers<Api>
>;

export type ZodiosRouter<Api extends ZodiosEnpointDescriptions> = IfEquals<
  Api,
  any,
  ReturnType<typeof express.Router> & ZodiosUse,
  Omit<ReturnType<typeof express.Router>, Method> & ZodiosHandlers<Api>
>;
