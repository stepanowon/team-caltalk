const express = require("express");
const { createMockMiddleware } = require("openapi-mock-express-middleware");
const swaggerUi = require("swagger-ui-express");
const swaggerDoc = require("../swagger/swagger.json"); // 또는 .yaml 파싱

const app = express();
app.use("/api", createMockMiddleware({ spec: "../swagger/swagger.json" })); // 목 서버
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc)); // Swagger UI

app.listen(3000);