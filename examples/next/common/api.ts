import z from "zod";
import { asApi } from "@zodios/core";

const user = z.object({
  id: z.number(),
  name: z.string(),
  age: z.number(),
  email: z.string(),
});

export const userApi = asApi([
  {
    method: "get",
    path: "/users",
    parameters: [
      {
        name: "email",
        type: "Query",
        schema: z.string().email(),
      },
    ],
    response: z.array(user),
  },
  {
    method: "get",
    path: "/users/:id",
    response: user,
    errors: [
      {
        status: "default",
        schema: z.object({
          error: z.object({
            code: z.number(),
            message: z.string(),
          }),
        }),
      },
    ],
  },
]);
