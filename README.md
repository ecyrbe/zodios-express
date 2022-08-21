 <h1 align="center">Zodios</h1>
 <p align="center">
   <a href="https://github.com/ecyrbe/zodios-express">
     <img align="center" src="https://raw.githubusercontent.com/ecyrbe/zodios/main/docs/logo.svg" width="128px" alt="Zodios logo">
   </a>
 </p>
 <p align="center">
    Zodios express is a typescript end to end type helper for express using <a href="https://github.com/colinhacks/zod">zod</a>
    <br/>
 </p>
 
 <p align="center">
   <a href="https://www.npmjs.com/package/@zodios/express">
   <img src="https://img.shields.io/npm/v/@zodios/express.svg" alt="langue typescript">
   </a>
   <a href="https://www.npmjs.com/package/@zodios/express">
   <img alt="npm" src="https://img.shields.io/npm/dw/@zodios/express">
   </a>
   <a href="https://github.com/ecyrbe/zodios/blob/main/LICENSE">
    <img alt="GitHub" src="https://img.shields.io/github/license/ecyrbe/zodios-express">   
   </a>
   <img alt="GitHub Workflow Status" src="https://img.shields.io/github/workflow/status/ecyrbe/zodios-express/CI">
 </p>

# What is it ?

It's an express adapter for zodios that helps you type your express routes.
  
- really simple centralized API declaration
- router endpoints autocompletion
- typescript autocompletion for query, path, header and body input parameters (`req` is fully typed)
- typescript autocompletion for response body (`res.json()`)
- input validation thanks to zod
- openapi specification generation out of the box (using swagger)
- end to end typesafe APIs (a la tRPC when using both @zodios/express and @zodios/core)
  
**Table of contents:**

- [What is it ?](#what-is-it-)
- [Install](#install)
- [How to use it ?](#how-to-use-it-)
  - [`zodiosApp` : Declare your API for fullstack end to end type safety](#zodiosapp--declare-your-api-for-fullstack-end-to-end-type-safety)
  - [`zodiosRouter` : Split your apppplication with multiple routers](#zodiosrouter--split-your-apppplication-with-multiple-routers)

# Install

```bash
> npm install @zodios/express
```

or

```bash
> yarn add @zodios/express
```

# How to use it ?

For an almost complete example on how to use zodios and how to split your APIs declarations, take a look at [dev.to](examples/dev.to/) example.

## `zodiosApp` : Declare your API for fullstack end to end type safety

Here is an example of API declaration with Zodios.
  
in a common directory (ex: `src/common/api.ts`) :

```typescript
import { Zodios } from "@zodios/core";
import { z } from "zod";

const userApi = asApi([
  {
    method: "get",
    path: "/users/:id", // auto detect :id and ask for it in apiClient get params
    alias: "getUser", // optionnal alias to call this endpoint with it
    description: "Get a user",
    response: z.object({
      id: z.number(),
      name: z.string(),
    }),
  },
]);
```

in your frontend (ex: `src/client/api.ts`) :

```typescript
import { Zodios } from "@zodios/core";
import { userApi } from "../../common/api";

const apiClient = new Zodios(
  "https://jsonplaceholder.typicode.com",
  userApi
);

//   typed                     alias   auto-complete params
//     ▼                        ▼                   ▼
const user = await apiClient.getUser({ params: { id: 1 } });
```

in your backend (ex: `src/server/router.ts`) :
```typescript
import { zodiosApp } from "@zodios/express";
import { userApi } from "../../common/api";

// just an express adapter that is aware of  your api, app is just an express app with type annotations and validation middlewares
const app = zodiosApp(userApi);

//  auto-complete path  fully typed and validated input params (body, query, path, header)
//          ▼           ▼    ▼
app.get("/users/:id", (req, res) => {
  // res.json is typed thanks to zod
  res.json({
    //   auto-complete req.params.id
    //              ▼
    id: req.params.id,
    name: "John Doe",
  });
})

app.listen(3000);
```

## `zodiosRouter` : Split your apppplication with multiple routers

When organizing your express application, you usually want to split your API declarations into separate Routers.
You can use the `zodiosRouter` to do that with a `zodiosApp` without APIs attached.

```typescript
import { zodiosApp, zodiosRouter } from "@zodios/express";

const app = zodiosApp(); // just an axpess app with type annotations
const userRouter = zodiosRouter(userApi); // just an express router with type annotations and validation middlewares
const adminRouter = zodiosRouter(adminApi); // just an express router with type annotations and validation middlewares

const app.use(userRouter,adminRouter);

app.listen(3000);
```
