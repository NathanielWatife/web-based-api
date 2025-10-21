const User = require('../models/User');

// Creates an admin account on startup if it doesn't exist
// Reads credentials from env: ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_FULLNAME, ADMIN_MATRIC_NO
module.exports = async function bootstrapAdmin() {
  try {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password) {
      console.log('Admin bootstrap skipped: ADMIN_EMAIL or ADMIN_PASSWORD not set');
      return;
    }

    const existing = await User.findOne({ email, role: 'admin' });
    if (existing) {
      console.log(`Admin account exists: ${email}`);
      return;
    }

    const fullName = process.env.ADMIN_FULLNAME || 'Admin User';
    const [firstName, ...rest] = fullName.trim().split(/\s+/);
    const lastName = rest.join(' ') || 'User';

    // Matric number must match schema regex: ^[A-Z]\/[A-Z]{2}\/\d{2}\/\d+$
    const yy = new Date().getFullYear().toString().slice(-2);
    const defaultMatric = `A/AD/${yy}/000001`;
    // const matricNo = (process.env.ADMIN_MATRIC_NO || defaultMatric).toUpperCase();

    await User.create({
      firstName,
      lastName,
      email,
    //   matricNo,
      password,
      role: 'admin',
      isVerified: true,
      faculty: 'Administration',
      department: 'System Administration',
      programme: 'Higher National Diploma',
      admissionYear: `20${yy}`,
    });

    console.log(`Admin account created: ${email} `);
  } catch (err) {
    console.error('Admin bootstrap failed:', err?.message || err);
  }
};
