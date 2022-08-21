import z from "zod";

type MapPrefixPath<
  T extends readonly unknown[],
  PrefixValue extends string,
  ACC extends unknown[] = []
> = T extends readonly [infer Head, ...infer Tail]
  ? MapPrefixPath<
      Tail,
      PrefixValue,
      [
        ...ACC,
        {
          [K in keyof Head]: K extends "path"
            ? Head[K] extends string
              ? `${PrefixValue}${Head[K]}`
              : Head[K]
            : Head[K];
        }
      ]
    >
  : ACC;

export function prefixApi<Prefix extends string, Api extends readonly any[]>(
  prefix: Prefix,
  api: Api
) {
  return api.map((endpoint) => ({
    ...endpoint,
    path: `${prefix}${endpoint.path}`,
  })) as MapPrefixPath<Api, Prefix>;
}

export function isZodNumber(t: z.ZodType): boolean {
  // @ts-ignore
  if (t._def.typeName === "ZodNumber") {
    return true;
  }
  // @ts-ignore
  if (t._def.innerType) {
    // @ts-ignore
    return isZodNumber(t._def.innerType);
  }
  return false;
}

export function withoutTransform(t: z.ZodType): z.ZodType {
  // @ts-ignore
  if (t._def.typeName === "ZodEffect") {
    // @ts-ignore
    return withoutTransform(t._def.innerType);
  }
  return t;
}
