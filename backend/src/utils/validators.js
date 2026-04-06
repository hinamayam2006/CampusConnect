import { z } from 'zod';

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name too long'),

  email: z
    .string()
    .email('Invalid email address'),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain one uppercase letter')
    .regex(/[0-9]/, 'Must contain one number')
    .regex(/[!@#$%^&*(),.?":{}|<>_\-]/, 'Must contain one special character'),

  department: z.enum(
    ['CS', 'EE', 'ME', 'CE', 'BBA', 'Economics', 'Law', 'Medicine', 'Other'],
    { errorMap: () => ({ message: 'Invalid department' }) }
  ),

  year: z
    .number({ invalid_type_error: 'Year must be a number' })
    .min(1)
    .max(4),

  location: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * Schema for updating user profile
 *
 * Key features:
 * - All fields optional (users can update some or all fields)
 * - year: uses .coerce to convert string "3" → number 3
 * - canTeach/needsTutoring: expects array of strings, defaults to empty array
 * - This prevents type mismatches between frontend form data and backend expectations
 *
 * Industry Practice:
 * - Input coercion: Convert HTML form strings to proper types
 * - Treat all update fields as optional/partial updates
 * - Apply same strict constraints (min/max length) as registration
 */
export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name too long')
    .optional(),

  location: z
    .string()
    .max(100, 'Location too long')
    .optional(),

  department: z
    .enum(
      ['CS', 'EE', 'ME', 'CE', 'BBA', 'Economics', 'Law', 'Medicine', 'Other'],
      { errorMap: () => ({ message: 'Invalid department' }) }
    )
    .optional(),

  year: z
    .coerce // Convert string "3" to number 3
    .number({ invalid_type_error: 'Year must be a valid number' })
    .min(1, 'Year must be between 1 and 4')
    .max(4, 'Year must be between 1 and 4')
    .optional(),

  // Arrays of strings: ["Math", "Physics"]
  // Allow empty array by default to "clear" teaching/tutoring subjects
  canTeach: z
    .array(
      z.string().min(1, 'Subject cannot be empty')
    )
    .optional()
    .default([]),

  needsTutoring: z
    .array(
      z.string().min(1, 'Subject cannot be empty')
    )
    .optional()
    .default([]),
});
