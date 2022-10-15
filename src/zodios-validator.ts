import express from "express";
import {
  ZodiosEndpointDefinition,
  ZodiosEndpointDefinitions,
} from "@zodios/core";
import { isZodType, withoutTransform } from "./zodios.utils";
import { z } from "zod";

function validateEndpointMiddleware(
  endpoint: ZodiosEndpointDefinition,
  transform: boolean
) {
  return (
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
            const result = schema.safeParse(req.body);
            if (!result.success) {
              return res.status(400).json({
                context: "body",
                error: result.error.issues,
              });
            }
            req.body = result.data;
          }
          break;
        case "Path":
          {
            if (
              isZodType(schema, z.ZodFirstPartyTypeKind.ZodNumber) &&
              req.params[parameter.name] &&
              !isNaN(+req.params[parameter.name])
            ) {
              const result = schema.safeParse(+req.params[parameter.name]!);
              if (!result.success) {
                return res.status(400).json({
                  context: `query.${parameter.name}`,
                  error: result.error.issues,
                });
              }
              req.params[parameter.name] = result.data as any;
              return next();
            }
            const result = schema.safeParse(req.params[parameter.name]);
            if (!result.success) {
              return res.status(400).json({
                context: `path.${parameter.name}`,
                error: result.error.issues,
              });
            }
          }
          break;
        case "Query":
          {
            if (
              isZodType(schema, z.ZodFirstPartyTypeKind.ZodNumber) &&
              req.query[parameter.name] &&
              !isNaN(+req.query[parameter.name]!)
            ) {
              const result = schema.safeParse(+req.query[parameter.name]!);
              if (!result.success) {
                return res.status(400).json({
                  context: `query.${parameter.name}`,
                  error: result.error.issues,
                });
              }
              req.query[parameter.name] = result.data as any;
              return next();
            }
            const result = schema.safeParse(req.query[parameter.name]);
            if (!result.success) {
              return res.status(400).json({
                context: `query.${parameter.name}`,
                error: result.error.issues,
              });
            }
          }
          break;
        case "Header":
          {
            const result = parameter.schema.safeParse(req.get(parameter.name));
            if (!result.success) {
              return res.status(400).json({
                context: `header.${parameter.name}`,
                error: result.error.issues,
              });
            }
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
export function useValidateParameters(
  api: ZodiosEndpointDefinitions,
  router: express.Router,
  transform: boolean
) {
  const methods = ["get", "post", "put", "patch", "delete"] as const;
  for (let method of methods) {
    const savedMethod = router[method].bind(router);
    // @ts-ignore
    router[method] = (path: string, ...handlers: any[]) => {
      const endpoint = api.find(
        (endpoint) => endpoint.method === method && endpoint.path === path
      );
      if (endpoint && endpoint.parameters) {
        handlers = [
          validateEndpointMiddleware(endpoint, transform),
          ...handlers,
        ];
      }
      return savedMethod(path, ...handlers);
    };
  }
}
