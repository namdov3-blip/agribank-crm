/**
 * General Helper Utilities
 */

/**
 * Generate a random secure token
 */
export const generateToken = (length: number = 32): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Paginate an array
 */
export const paginate = <T>(
  items: T[],
  page: number = 1,
  pageSize: number = 20
): {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
} => {
  const total = items.length;
  const totalPages = Math.ceil(total / pageSize);
  const offset = (page - 1) * pageSize;
  const data = items.slice(offset, offset + pageSize);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages
  };
};

/**
 * Parse BigInt safely (Prisma returns BigInt for large numbers)
 */
export const parseBigInt = (value: any): number => {
  if (typeof value === 'bigint') {
    return Number(value);
  }
  if (typeof value === 'string') {
    return parseInt(value, 10);
  }
  return value;
};

/**
 * Convert Prisma BigInt fields to numbers for JSON response
 * Also converts Date objects to ISO strings
 */
export const convertBigIntsToNumbers = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'bigint') {
    return Number(obj);
  }

  // Convert Date objects to ISO strings
  if (obj instanceof Date) {
    return obj.toISOString();
  }

  if (Array.isArray(obj)) {
    return obj.map(item => convertBigIntsToNumbers(item));
  }

  if (typeof obj === 'object') {
    const converted: any = {};
    for (const key in obj) {
      converted[key] = convertBigIntsToNumbers(obj[key]);
    }
    return converted;
  }

  return obj;
};

/**
 * Sleep utility for async operations
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Get client IP from request
 */
export const getClientIp = (req: any): string => {
  return (
    req.headers['x-forwarded-for']?.split(',')[0] ||
    req.headers['x-real-ip'] ||
    req.socket.remoteAddress ||
    'unknown'
  );
};

/**
 * Sanitize filename for safe storage
 */
export const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase();
};

/**
 * Generate unique filename with timestamp
 */
export const generateUniqueFilename = (originalFilename: string): string => {
  const timestamp = Date.now();
  const extension = originalFilename.split('.').pop();
  const nameWithoutExt = originalFilename.replace(`.${extension}`, '');
  const sanitized = sanitizeFilename(nameWithoutExt);

  return `${sanitized}_${timestamp}.${extension}`;
};
