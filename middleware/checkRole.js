export const checkRole = (requiredRole) => {
  return (req, res, next) => {
    console.log('🧾 Role check:');
    console.log('🔑 Required Role:', requiredRole);
    console.log('👤 User Role:', req.user?.role);
    console.log('👤 User ID:', req.user?.id);

    if (!req.user) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (Array.isArray(requiredRole)) {
      if (!requiredRole.includes(req.user.role)) {
        return res.status(403).json({ message: 'Access denied' });
      }
    } else {
      if (req.user.role !== requiredRole) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    console.log('✅ Role matched, access granted');
    next();
  };
};
