import express, { RouterOptions } from "express";
import z from "zod";
import { ZodiosEnpointDescriptions } from "@zodios/core";
import { Narrow } from "@zodios/core/lib/utils.types";
import {
  ZodiosApp,
  ZodiosRouter,
  ZodiosAppOptions,
  ZodiosRouterOptions,
} from "./zodios.types";
import { isZodNumber, withoutTransform } from "./zodios.utils";

export function useValidateParameters<Api extends ZodiosEnpointDescriptions>(
  api: Api,
  router: express.Router,
  transform: boolean
) {
  for (let endpoint of api) {
    if (endpoint.parameters) {
      router[endpoint.method](endpoint.path, (req, res, next) => {
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
            case "Query":
              {
                if (isZodNumber(schema) && req.query[parameter.name]) {
                  const result = schema.safeParse(+req.query[parameter.name]!);
                  if (!result.success) {
                    return res.status(400).json({
                      context: `query.${parameter.name}`,
                      error: result.error.issues,
                    });
                  }
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
                const result = parameter.schema.safeParse(
                  req.get(parameter.name)
                );
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
      });
    }
  }
}

export function zodiosApp<Api extends ZodiosEnpointDescriptions = any>(
  api?: Narrow<Api>,
  options: ZodiosAppOptions = {}
): ZodiosApp<Api> {
  const {
    express: app = express(),
    validate = true,
    transform = false,
  } = options;
  if (!options.express) {
    app.use(express.json());
  }
  if (api && validate) {
    useValidateParameters(api, app, transform);
  }
  return app as unknown as ZodiosApp<Api>;
}

export function zodiosRouter<Api extends ZodiosEnpointDescriptions>(
  api: Narrow<Api>,
  options?: RouterOptions & ZodiosRouterOptions
): ZodiosRouter<Api> {
  const {
    validate = true,
    transform = false,
    ...routerOptions
  } = options || {};
  const router = options?.router ?? express.Router(routerOptions);
  if (validate) {
    useValidateParameters(api, router, transform);
  }
  return router as unknown as ZodiosRouter<Api>;
}
