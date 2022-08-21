import { asApi } from "@zodios/core";
import z from "zod";
import { prefixApi } from "./zodios.utils";
import { Assert } from "@zodios/core/lib/utils.types";

describe("zodios utils", () => {
  it("should prefix api", () => {
    const response = z.object({
      id: z.number(),
    });
    const api = asApi([
      {
        method: "get",
        path: "/",
        response,
      },
      {
        method: "get",
        path: "/foo",
        response,
      },
    ]);
    type Expected = [
      {
        method: "get";
        path: "/api/";
        response: typeof response;
      },
      {
        method: "get";
        path: "/api/foo";
        response: typeof response;
      }
    ];
    const prefix = "/api";
    const prefixedApi = prefixApi(prefix, api);
    const testApi: Assert<typeof prefixedApi, Expected> = true;
    expect(prefixedApi).toEqual([
      {
        method: "get",
        path: "/api/",
        response,
      },
      {
        method: "get",
        path: "/api/foo",
        response,
      },
    ]);
  });
});
