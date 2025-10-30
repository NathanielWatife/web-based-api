const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Book = require('./models/Book');
const { logger } = require('./utils/logger');

dotenv.config();

const sampleBooks = [
  {
    title: "Introduction to Computer Science",
    author: "John Smith",
    isbn: "978-0123456789",
    description: "A comprehensive introduction to computer science concepts and programming.",
    price: 4500,
    category: "Computer Science",
    courseCode: "CSC101",
    faculty: "School of Technology",
    stockQuantity: 50,
    imageUrl: "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=400"
  },
  {
    title: "Principles of Economics",
    author: "Jane Doe",
    isbn: "978-0123456790",
    description: "Fundamental principles of micro and macro economics.",
    price: 3800,
    category: "Business & Economics",
    courseCode: "ECO101",
    faculty: "School of Business",
    stockQuantity: 35,
    imageUrl: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400"
  },
  {
    title: "Electrical Engineering Fundamentals",
    author: "Michael Brown",
    isbn: "978-0123456791",
    description: "Basic principles and applications of electrical engineering.",
    price: 5200,
    category: "Engineering",
    courseCode: "EEE101",
    faculty: "School of Engineering",
    stockQuantity: 25,
    imageUrl: "https://images.unsplash.com/photo-1581093458791-8a6bc22e7d8a?w=400"
  },
  {
    title: "Mass Communication Theory",
    author: "Sarah Johnson",
    isbn: "978-0123456792",
    description: "Theoretical foundations of mass communication and media studies.",
    price: 3200,
    category: "Arts & Humanities",
    courseCode: "MAC101",
    faculty: "School of Arts",
    stockQuantity: 40,
    imageUrl: "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=400"
  },
  {
    title: "Architectural Design Principles",
    author: "Robert Wilson",
    isbn: "978-0123456793",
    description: "Fundamental principles and practices of architectural design.",
    price: 4800,
    category: "Architecture",
    courseCode: "ARC101",
    faculty: "School of Environmental Studies",
    stockQuantity: 20,
    imageUrl: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400"
  }
];

const seedDatabase = async () => {
  try {
  await mongoose.connect(process.env.MONGO_URI);
  logger.info('Connected to database');

    // Clear existing data
  await User.deleteMany({});
  await Book.deleteMany({});
  logger.info('Cleared existing data');

    // Create admin user
    const adminUser = await User.create({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@yabatech.edu.ng',
      matricNo: 'ADMIN001',
      password: 'admin123',
      role: 'admin',
      isVerified: true,
      faculty: 'Administration',
      department: 'System Administration',
      programme: 'Higher National Diploma',
      admissionYear: '2023'
    });
  logger.info('Admin user created');

    // Create sample student
    const studentUser = await User.create({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@student.yabatech.edu.ng',
      matricNo: 'F/ND/23/321001',
      password: 'student123',
      role: 'student',
      isVerified: true,
      faculty: 'School of Technology',
      department: 'Computer Science',
      programme: 'National Diploma',
      admissionYear: '2023',
      phoneNumber: '+2348012345678'
    });
  logger.info('Sample student created');

    // Create sample books
  await Book.create(sampleBooks);
  logger.info('Sample books created');

    logger.info('Database seeded successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Seeding error: ' + (error?.message || error));
    process.exit(1);
  }
};

seedDatabase();