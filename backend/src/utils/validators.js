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

const deptEnum = z.enum(
  ['CS', 'EE', 'ME', 'CE', 'BBA', 'Economics', 'Law', 'Medicine', 'Other'],
  { errorMap: () => ({ message: 'Invalid department' }) }
);

export const createListingSchema = z
  .object({
    category: z.enum(['general', 'textbook']),
    title: z.string().min(3).max(120),
    description: z.string().min(10).max(4000),
    courseCode: z.string().max(32).optional().default(''),
    semester: z.coerce.number().min(1).max(8).optional().nullable(),
    department: deptEnum,
    listingType: z.enum(['sale', 'rent', 'exchange']),
    price: z.coerce.number().min(0).optional().nullable(),
    condition: z.string().max(80).optional().default(''),
    images: z.array(z.string().url()).max(8).optional().default([]),
  })
  .refine(
    (d) => d.listingType === 'exchange' || (d.price != null && !Number.isNaN(d.price)),
    { message: 'Price is required unless type is exchange', path: ['price'] }
  );

export const updateListingSchema = z
  .object({
    category: z.enum(['general', 'textbook']).optional(),
    title: z.string().min(3).max(120).optional(),
    description: z.string().min(10).max(4000).optional(),
    courseCode: z.string().max(32).optional(),
    semester: z.coerce.number().min(1).max(8).optional().nullable(),
    department: deptEnum.optional(),
    listingType: z.enum(['sale', 'rent', 'exchange']).optional(),
    price: z.coerce.number().min(0).optional().nullable(),
    condition: z.string().max(80).optional(),
    images: z.array(z.string().url()).max(8).optional(),
    status: z.enum(['active', 'reserved', 'sold']).optional(),
  })
  .strict();

export const createRideSchema = z.object({
  originName: z.string().min(2).max(120),
  destName: z.string().min(2).max(120),
  originLat: z.coerce.number().optional().nullable(),
  originLng: z.coerce.number().optional().nullable(),
  destLat: z.coerce.number().optional().nullable(),
  destLng: z.coerce.number().optional().nullable(),
  departureTime: z.coerce.date(),
  seatsTotal: z.coerce.number().min(1).max(8),
  vehicleInfo: z.string().max(120).optional().default(''),
  notes: z.string().max(1000).optional().default(''),
  recurring: z
    .object({
      enabled: z.boolean(),
      daysOfWeek: z.array(z.number().min(0).max(6)).optional().default([]),
    })
    .optional(),
});

export const rateUserSchema = z.object({
  score: z.number().min(1).max(5),
  comment: z.string().max(500).optional().default(''),
  context: z.enum(['marketplace', 'ride', 'borrow', 'tutoring']),
});

export const marketplaceSearchLogSchema = z.object({
  search: z.string().max(200).optional().default(''),
  category: z.enum(['general', 'textbook']).optional(),
  department: deptEnum.optional(),
  semester: z.coerce.number().min(1).max(8).optional().nullable(),
});

export const rideSearchLogSchema = z.object({
  originName: z.string().max(120).optional().default(''),
  destName: z.string().max(120).optional().default(''),
});
