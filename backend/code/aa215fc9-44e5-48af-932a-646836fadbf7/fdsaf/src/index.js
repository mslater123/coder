// Entry point for the Express application
const express = require("express");
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./swagger.json"); // assume swagger spec exists

const app = express();
app.use(express.json());

// Register routes
const userRouter = require("./routes/user");
app.use("/api/users", userRouter);

// Swagger UI documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get("/health", (req, res) => {
    res.send("OK");
});

// Start server when run directly
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server listening on http://localhost:${PORT}`);
        console.log(
            `Swagger UI available at http://localhost:${PORT}/api-docs`
        );
    });
}

module.exports = app;
