// Integration tests for the Express server
// Run with: npm test (ensure jest and supertest are installed)

const request = require("supertest");
const app = require("./index");

describe("GET /", () => {
    it("should respond with Hello World!", async () => {
        const response = await request(app).get("/");
        expect(response.statusCode).toBe(200);
        expect(response.text).toBe("Hello World!");
    });
});

describe("GET /api-docs", () => {
    it("should serve Swagger UI", async () => {
        const response = await request(app).get("/api-docs");
        expect(response.statusCode).toBe(200);
        // Basic check that HTML is returned (Swagger UI contains "swagger-ui" string)
        expect(response.text).toContain("swagger-ui");
    });
});
