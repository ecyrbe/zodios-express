import { zodiosApp, zodiosRouter } from "@zodios/express";
import { userApi } from "../../common/api";

const app = zodiosApp();
const router = zodiosRouter(userApi);
app.use("/api", router);

router.get("/users", (req, res) => {
  res.status(200).json([
    {
      id: 1,
      name: "John Doe",
      age: 30,
      email: "john.doe@test.com",
    },
  ]);
});

router.get("/users/:id", (req, res, next) => {
  res.status(404).json({
    error: {
      code: 404,
      message: "User not found",
    },
  });
});

export default app;
