import express from "express";
import { ZodiosEndpointDefinitions } from "@zodios/core";
import { isZodType, withoutTransform } from "./zodios.utils";
import { z } from "zod";

export function useValidateParameters(
  api: ZodiosEndpointDefinitions,
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
