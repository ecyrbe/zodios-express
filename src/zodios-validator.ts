import express from "express";
import {
  ZodiosEndpointDefinition,
  ZodiosEndpointDefinitions,
} from "@zodios/core";
import { isZodType, withoutTransform } from "./zodios.utils";
import { z, ZodObject } from "zod";
import { ZodiosRouterValidationErrorHandler } from "./zodios.types";

const METHODS = ["get", "post", "put", "patch", "delete"] as const;

async function validateParam(schema: z.ZodType<any>, parameter: unknown) {
  if (
    !isZodType(schema, z.ZodFirstPartyTypeKind.ZodString) &&
    parameter &&
    typeof parameter === "string"
  ) {
    return z
      .preprocess((x) => {
        try {
          return JSON.parse(x as string);
        } catch {
          return x;
        }
      }, schema)
      .safeParseAsync(parameter);
  }
  return schema.safeParseAsync(parameter);
}

function validateEndpointMiddleware(
  endpoint: ZodiosEndpointDefinition,
  transform: boolean
) {
  return async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    for (let parameter of endpoint.parameters!) {
      let schema = parameter.schema;
      if (!transform) {
        schema = withoutTransform(schema);
      }

      switch (parameter.type) {
        case "Body":
          {
            const result = await schema.safeParseAsync(req.body);
            if (!result.success) {
              return next({
                context: "body",
                error: result.error.issues,
              });
            }
            req.body = result.data;
          }
          break;
        case "Path":
          {
            const result = await validateParam(
              schema,
              req.params[parameter.name]
            );
            if (!result.success) {
              return next({
                context: `path.${parameter.name}`,
                error: result.error.issues,
              });
            }
            req.params[parameter.name] = result.data as any;
          }
          break;
        case "Query":
          {
            const result = await validateParam(
              schema,
              req.query[parameter.name]
            );
            if (!result.success) {
              return next({
                context: `query.${parameter.name}`,
                error: result.error.issues,
              });
            }
            req.query[parameter.name] = result.data as any;
          }
          break;
        case "Header":
          {
            const result = await parameter.schema.safeParseAsync(
              req.get(parameter.name)
            );
            if (!result.success) {
              return next({
                context: `header.${parameter.name}`,
                error: result.error.issues,
              });
            }
            req.headers[parameter.name] = result.data as any;
          }
          break;
      }
    }
    next();
  };
}

/**
 * monkey patch express.Router to add inject the validation middlewares after the route is matched
 * @param api - the api definition
 * @param router - express router to patch
 * @param transform - whether to transform the data or not
 */
export function injectParametersValidators<Context extends ZodObject<any>>(
  api: ZodiosEndpointDefinitions,
  router: express.Router,
  transform: boolean,
  validationErrorHandler: ZodiosRouterValidationErrorHandler<Context>
) {
  for (let method of METHODS) {
    const savedMethod = router[method].bind(router);
    // @ts-ignore
    router[method] = (path: string, ...handlers: any[]) => {
      const endpoint = api.find(
        (endpoint) => endpoint.method === method && endpoint.path === path
      );
      if (endpoint && endpoint.parameters) {
        handlers = [
          validateEndpointMiddleware(endpoint, transform),
          validationErrorHandler,
          ...handlers,
        ];
      }
      return savedMethod(path, ...handlers);
    };
  }
}
