function isPlainObject(val) {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}

function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i += 1) {
      if (isPlainObject(obj[i]) || Array.isArray(obj[i])) sanitizeObject(obj[i]);
    }
    return obj;
  }

  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete obj[key];
      continue;
    }
    const val = obj[key];
    if (isPlainObject(val) || Array.isArray(val)) sanitizeObject(val);
  }
  return obj;
}

module.exports = function sanitizeMiddleware() {
  return function (req, _res, next) {
    try {
      if (req.body && (typeof req.body === 'object')) sanitizeObject(req.body);
      if (req.params && (typeof req.params === 'object')) sanitizeObject(req.params);
      // Mutate req.query's contents only; do not reassign req.query (Express 5 getter)
      if (req.query && (typeof req.query === 'object')) sanitizeObject(req.query);
    } catch (_) {
      // best-effort; continue
    }
    next();
  };
};
