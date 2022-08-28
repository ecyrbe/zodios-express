import { zodiosNextApp } from "@zodios/express";
import { userRouter } from "./users";

export const app = zodiosNextApp();
app.use("/api", userRouter);
