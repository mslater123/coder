// Integration tests for the /api/users endpoint using supertest

const request = require("supertest");
const app = require("../src/index");

describe("User API integration tests", () => {
    test("POST /api/users with valid data creates a user", async () => {
        const response = await request(app)
            .post("/api/users")
            .send({ name: "John Doe", email: "john@example.com" })
            .expect(201);

        expect(response.body).toHaveProperty("id");
        expect(response.body.name).toBe("John Doe");
        expect(response.body.email).toBe("john@example.com");
    });

    test("POST /api/users with invalid data returns 400", async () => {
        const response = await request(app)
            .post("/api/users")
            .send({ name: "", email: "not-an-email" })
            .expect(400);

        expect(response.body).toHaveProperty("errors");
        expect(Array.isArray(response.body.errors)).toBe(true);
    });

    test("GET /api/users returns list of users", async () => {
        const response = await request(app)
            .get("/api/users")
            .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        // At least one user should exist from previous POST test
        expect(response.body.length).toBeGreaterThanOrEqual(1);
    });
});
