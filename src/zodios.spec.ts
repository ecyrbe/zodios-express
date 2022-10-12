import express from "express";
import request from "supertest";
import z from "zod";
import { apiBuilder, makeErrors } from "@zodios/core";
import { zodiosContext } from "./zodios";

const user = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
});

const errors = makeErrors([
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
      {
        name: "Authorization",
        type: "Header",
        schema: z.string().regex(/^Bearer\s+[a-zA-Z0-9]+$/),
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
    const app = zodiosContext().app(userApi);
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
    const app = zodiosContext().app(userApi);
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

  it("should get many users with context", async () => {
    const ctx = zodiosContext(
      z.object({
        user: z.object({
          id: z.number(),
          name: z.string(),
          email: z.string().email(),
        }),
      })
    );
    const app = ctx.app();
    const router = ctx.router(userApi);
    router.use((req, res, next) => {
      req.user = {
        id: 1,
        name: "john doe",
        email: "john.doe@domain.com",
      };
      next();
    });
    app.use(router);
    router.get("/users", (req, res, next) => {
      res.json([
        req.user,
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
    const app = zodiosContext().app(userApi);
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
      context: "query.limit",
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
    const app = zodiosContext().app(userApi);
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
    const app = zodiosContext().app(userApi);
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
      context: "body",
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
  it("should succeed to put a user if authenticated", async () => {
    const app = zodiosContext().app(userApi);
    app.put("/users/:id", (req, res) => {
      res.json(req.body);
    });
    const req = request(app);
    const result = await req
      .put("/users/1")
      .send({
        id: 1,
        name: "john doe",
        email: "john.doe@domain.com",
      })
      .set("Authorization", "Bearer 12345");
    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      id: 1,
      name: "john doe",
      email: "john.doe@domain.com",
    });
  });
  it("should fail to put a user if not authenticated", async () => {
    const app = zodiosContext().app(userApi);
    app.put("/users/:id", (req, res) => {
      res.json(req.body);
    });
    const req = request(app);
    const result = await req.put("/users/1").send({
      id: 1,
      name: "john doe",
      email: "john.doe@domain.com",
    });
    expect(result.status).toBe(400);
  });
});
