const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Book = require('../models/Book');
const Category = require('../models/Category');

const MONGODB_URI = process.env.MONGO_URI;

const categories = [
  {
    name: 'Computer Science',
    description: 'Books related to programming, algorithms, and computer systems'
  },
  {
    name: 'Engineering',
    description: 'Civil, Mechanical, Electrical and other engineering disciplines'
  },
  {
    name: 'Business',
    description: 'Business management, entrepreneurship, and economics'
  },
  {
    name: 'Mathematics',
    description: 'Pure and applied mathematics, statistics, and calculus'
  },
  {
    name: 'Science',
    description: 'Physics, Chemistry, Biology and other sciences'
  },
  {
    name: 'General Studies',
    description: 'General education and liberal arts courses'
  }
];

const books = [
  {
    title: 'Introduction to Algorithms',
    author: 'Thomas H. Cormen',
    isbn: '9780262033848',
    price: 3500,
    category: 'Computer Science',
    description: 'A comprehensive guide to algorithms and data structures used in computer science.',
    stockQuantity: 15,
    publisher: 'MIT Press',
    publicationYear: 2009
  },
  {
    title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
    author: 'Robert C. Martin',
    isbn: '9780132350884',
    price: 2800,
    category: 'Computer Science',
    description: 'Learn how to write clean, maintainable code that other developers will appreciate.',
    stockQuantity: 12,
    publisher: 'Prentice Hall',
    publicationYear: 2008
  },
  {
    title: 'Engineering Mechanics: Statics',
    author: 'J.L. Meriam',
    isbn: '9781118807330',
    price: 4200,
    category: 'Engineering',
    description: 'Fundamental principles of statics for engineering students.',
    stockQuantity: 8,
    publisher: 'Wiley',
    publicationYear: 2015
  },
  {
    title: 'Principles of Economics',
    author: 'N. Gregory Mankiw',
    isbn: '9781305585126',
    price: 3800,
    category: 'Business',
    description: 'Comprehensive introduction to economics principles and theories.',
    stockQuantity: 20,
    publisher: 'Cengage Learning',
    publicationYear: 2017
  },
  {
    title: 'Advanced Engineering Mathematics',
    author: 'Erwin Kreyszig',
    isbn: '9780470458365',
    price: 4500,
    category: 'Mathematics',
    description: 'Advanced mathematical methods for engineering applications.',
    stockQuantity: 10,
    publisher: 'Wiley',
    publicationYear: 2011
  },
  {
    title: 'University Physics with Modern Physics',
    author: 'Hugh D. Young',
    isbn: '9780321973610',
    price: 5200,
    category: 'Science',
    description: 'Comprehensive physics textbook for university students.',
    stockQuantity: 18,
    publisher: 'Pearson',
    publicationYear: 2015
  }
];

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Book.deleteMany({});
    await Category.deleteMany({});
    console.log('Cleared existing data');

    // Create admin user
    const adminUser = await User.create({
      matricNo: 'ADM/01/0001',
      email: 'admin@yabatech.edu.ng',
      password: 'admin123',
      fullName: 'System Administrator',
      role: 'admin',
      isEmailVerified: true
    });
    console.log('Admin user created:', adminUser.email);

    // Create sample student user
    const studentUser = await User.create({
      matricNo: 'CST/20/1234',
      email: 'student@yabatech.edu.ng',
      password: 'student123',
      fullName: 'John Student',
      role: 'student',
      isEmailVerified: true
    });
    console.log('Student user created:', studentUser.email);

    // Create categories
    const createdCategories = await Category.insertMany(categories);
    console.log('Categories created:', createdCategories.length);

    // Create books
    const createdBooks = await Book.insertMany(books);
    console.log('Books created:', createdBooks.length);

    console.log('Database seeded successfully!');
    console.log('Admin Login: admin@yabatech.edu.ng / admin123');
    console.log('Student Login: student@yabatech.edu.ng / student123');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();