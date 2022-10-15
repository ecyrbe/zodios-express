import { makeApi } from "@zodios/core";
import { zodiosApp } from "../src/index";
import { z } from "zod";

const userApi = makeApi([
  {
    method: "get",
    path: "/users/:id",
    alias: "getUser",
    description: "Get a user",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.number(),
      },
    ],
    response: z.object({
      id: z.number(),
      name: z.string().nullable(),
    }),
  },
]);

const app = zodiosApp(userApi);

app.get("/users/:id", async (req, res) => {
  const { id } = req.params;
  //      ^?
  return res.json({
    id: req.params.id,
    name: "example",
  });
});
