// Reusable middleware factory
// Pass a Zod schema, it validates req.body
// If invalid → returns 400 with error details
// If valid → calls next() and req.body has clean data

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: result.error.issues.map((issue) => ({
        field: issue.path[0],
        message: issue.message,
      })),
    });
  }

  req.body = result.data; // replace body with clean validated data
  next();
};

export default validate;