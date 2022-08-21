import express from "express";
import request from "supertest";
import z from "zod";
import { apiBuilder, asErrors, EndpointError } from "@zodios/core";
import { zodiosApp, zodiosRouter } from "./zodios";

const user = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
});

const errors = asErrors([
  {
    status: "default",
    schema: z.object({
      error: z.object({
        code: z.string(),
        message: z.string(),
      }),
    }),
  },
]);

type Test = EndpointError<typeof userApi, "get", "/users/:id", 407>;

const userApi = apiBuilder({
  method: "get",
  path: "/users",
  parameters: [
    {
      name: "limit",
      type: "Query",
      schema: z.number().min(1).max(Infinity).default(Infinity),
    },
    {
      name: "offset",
      type: "Query",
      schema: z.number().min(0).max(Infinity).default(0),
    },
  ],
  response: z.array(user),
  errors,
})
  .addEndpoint({
    method: "get",
    path: "/users/:id",
    response: user,
    errors,
  })
  .addEndpoint({
    method: "post",
    path: "/users",
    parameters: [
      {
        name: "user",
        type: "Body",
        schema: user.omit({ id: true }),
      },
    ],
    response: user,
  })
  .addEndpoint({
    method: "put",
    path: "/users/:id",
    parameters: [
      {
        name: "user",
        type: "Body",
        schema: user,
      },
    ],
    response: user,
  })
  .addEndpoint({
    method: "delete",
    path: "/users/:id",
    response: user,
  })
  .build();

describe("router", () => {
  it("should get one user", async () => {
    const app = zodiosApp(userApi);
    app.get("/users/:id", (req, res, next) => {
      if (+req.params.id >= 10) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "User not found",
          },
        });
      }
      res.json({
        id: +req.params.id,
        name: "john doe",
        email: "test@domain.com",
      });
    });
    const req = request(app);
    const result = await req.get("/users/3").expect(200);
    expect(result.body).toEqual({
      id: 3,
      name: "john doe",
      email: "test@domain.com",
    });
  });

  it("should not find user if id>10", async () => {
    const app = zodiosApp(userApi);
    app.get("/users/:id", (req, res, next) => {
      if (+req.params.id >= 10) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "User not found",
          },
        });
      }
      res.json({
        id: +req.params.id,
        name: "john doe",
        email: "test@domain.com",
      });
    });
    const req = request(app);
    const result = await req.get("/users/10").expect(404);
    expect(result.body).toEqual({
      error: {
        code: "NOT_FOUND",
        message: "User not found",
      },
    });
  });

  it("should get many users", async () => {
    const app = zodiosApp();
    const router = zodiosRouter(userApi);
    app.use(router);
    router.get("/users", (req, res, next) => {
      res.json([
        {
          id: 1,
          name: "john doe",
          email: "john.doe@domain.com",
        },
        {
          id: 2,
          name: "jane doe",
          email: "jane.doe@domain.com",
        },
      ]);
    });
    const req = request(app);
    const result = await req.get("/users").expect(200);
    expect(result.body).toEqual([
      {
        id: 1,
        name: "john doe",
        email: "john.doe@domain.com",
      },
      {
        id: 2,
        name: "jane doe",
        email: "jane.doe@domain.com",
      },
    ]);
  });
  it("should return 400 error on bad query params", async () => {
    const app = zodiosApp(userApi);
    app.get("/users", (req, res, next) => {
      res.json([
        {
          id: 1,
          name: "john doe",
          email: "john.doe@domain.com",
        },
        {
          id: 2,
          name: "jane doe",
          email: "jane.doe@domain.com",
        },
      ]);
    });
    const req = request(app);
    const result = await req.get("/users?limit=0").expect(400);
    expect(result.body).toEqual({
      error: [
        {
          code: "too_small",
          inclusive: true,
          message: "Number must be greater than or equal to 1",
          minimum: 1,
          path: [],
          type: "number",
        },
      ],
    });
  });
  it("should create a user", async () => {
    const app = zodiosApp(userApi);
    app.post("/users", (req, res, next) => {
      res.json({
        id: 1,
        ...req.body,
      });
    });
    const req = request(app);
    const result = await req.post("/users").send({
      name: "john doe",
      email: "john.doe@domain.com",
    });
    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      id: 1,
      name: "john doe",
      email: "john.doe@domain.com",
    });
  });

  it("should return 400 error when sending an invalid user", async () => {
    const app = zodiosApp(userApi);
    app.post("/users", (req, res, next) => {
      res.json({
        id: 1,
        ...req.body,
      });
    });
    const req = request(app);
    const result = await req.post("/users").send({
      name: "john doe",
      email: "john.doe",
    });
    expect(result.status).toBe(400);
    expect(result.body).toEqual({
      error: [
        {
          validation: "email",
          code: "invalid_string",
          message: "Invalid email",
          path: ["email"],
        },
      ],
    });
  });
});
