import { makeApi } from "@zodios/core";
import { prefixApi, zodiosApp, zodiosContext } from "../src/index";
import { z } from "zod";
import { NextFunction, Request, Response } from "express";

const api = makeApi([
  {
    method: "get",
    path: "/:id",
    alias: "getUser",
    description: "Get a user",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.number(),
      },
      {
        name: "filter",
        type: "Query",
        schema: z.string().array().default([]),
      },
    ],
    response: z.object({
      id: z.number(),
      name: z.string().nullable(),
    }),
  },
]);

const userApi = prefixApi("/users", api);

const ctx = zodiosContext(z.object({ hello: z.string() }));
const app = ctx.app(userApi);

app.get("/users/:id", async (req, res) => {
  const { id } = req.params;
  //       ^?
  const { filter } = req.query;
  //       ^?
  return res.json({
    id: req.params.id,
    name: "example",
  });
});
