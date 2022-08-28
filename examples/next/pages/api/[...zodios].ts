import { zodiosNextApp, zodiosRouter } from "@zodios/express";
import { userApi } from "../../common/api";

const app = zodiosNextApp();
const router = zodiosRouter(userApi);
app.use("/api", router);

const users = [
  {
    id: 1,
    name: "John Doe",
    age: 30,
    email: "john.doe@test.com",
  },
];

router.get("/users", (req, res) => {
  res.status(200).json(users);
});

router.get("/users/:id", (req, res, next) => {
  const user = users.find((u) => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({
      error: {
        code: 404,
        message: "User not found",
      },
    });
  }
  return res.status(200).json(user);
});

router.post("/users", (req, res) => {
  const id = users.length + 1;
  const user = { ...req.body, id };
  users.push(user);
  res.status(201).json(user);
});

export default app;
