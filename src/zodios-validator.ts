import express from "express";
import {
  ZodiosEndpointDefinition,
  ZodiosEndpointDefinitions,
  ZodiosEndpointParameter,
} from "@zodios/core";
import { isZodType, withoutTransform } from "./zodios.utils";
import { z } from "zod";

function validateParam(
  schema: z.ZodType<any>,
  parameters: Record<string, unknown>,
  paramName: string
) {
  if (
    (isZodType(schema, z.ZodFirstPartyTypeKind.ZodNumber) ||
      isZodType(schema, z.ZodFirstPartyTypeKind.ZodBoolean)) &&
    parameters[paramName]
  ) {
    return z
      .preprocess((x) => {
        try {
          return JSON.parse(x as string);
        } catch {
          return x;
        }
      }, schema)
      .safeParse(parameters[paramName]);
  }
  return schema.safeParse(parameters[paramName]);
}

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
            const result = validateParam(schema, req.params, parameter.name);
            if (!result.success) {
              return res.status(400).json({
                context: `path.${parameter.name}`,
                error: result.error.issues,
              });
            }
            req.params[parameter.name] = result.data as any;
          }
          break;
        case "Query":
          {
            const result = validateParam(schema, req.query, parameter.name);
            if (!result.success) {
              return res.status(400).json({
                context: `query.${parameter.name}`,
                error: result.error.issues,
              });
            }
            req.query[parameter.name] = result.data as any;
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
