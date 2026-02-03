import { body, param, query, ValidationChain } from 'express-validator';

export const validateLead: ValidationChain[] = [
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('first_name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name must be between 1 and 100 characters'),
  body('last_name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name must be between 1 and 100 characters'),
  body('company_name')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Company name must not exceed 255 characters'),
  body('job_title')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Job title must not exceed 255 characters'),
  body('phone')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Phone must not exceed 50 characters'),
  body('source')
    .optional()
    .isIn(['website', 'referral', 'social', 'email', 'paid_ads', 'organic', 'partner', 'event', 'other'])
    .withMessage('Invalid lead source'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Each tag must be a string not exceeding 50 characters'),
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object'),
];

export const validateUUID: ValidationChain[] = [
  param('id')
    .isUUID()
    .withMessage('Invalid ID format'),
];

export const validatePagination: ValidationChain[] = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
];

export const validateWebhook: ValidationChain[] = [
  body('event_type')
    .notEmpty()
    .withMessage('Event type is required'),
  body('payload')
    .isObject()
    .withMessage('Payload must be an object'),
];

export function handleValidationErrors(
  req: any,
  res: any,
  next: any
): void {
  const errors = req.validationErrors();
  
  if (errors) {
    res.status(400).json({
      error: 'Validation failed',
      details: errors,
    });
    return;
  }
  
  next();
}
