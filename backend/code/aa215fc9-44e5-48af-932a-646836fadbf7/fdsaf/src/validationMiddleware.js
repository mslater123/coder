// Validation middleware for incoming JSON payloads
// Ensures required fields are present and of correct type

const { body, validationResult } = require("express-validator");

// Export an array of validators followed by a handler that checks the result
function validateUser() {
    return [
        body("name")
            .exists({ checkFalsy: true })
            .withMessage("Name is required")
            .isString()
            .withMessage("Name must be a string"),
        body("email")
            .exists({ checkFalsy: true })
            .withMessage("Email is required")
            .isEmail()
            .withMessage("Invalid email format"),
        (req, res, next) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            next();
        }
    ];
}

module.exports = { validateUser };
