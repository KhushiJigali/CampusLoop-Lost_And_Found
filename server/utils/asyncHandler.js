export const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
export function fail(status, message) { const error = new Error(message); error.status = status; throw error; }
