require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');

const seedProducts = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { family: 4 });
    console.log('MongoDB connected for seeding...');

    // Clear existing products
    await Product.deleteMany();
    console.log('Existing products cleared.');

    const products = [
      {
        sku: 'J-001',
        title: { en: 'Elegant Silver Necklace' },
        description: { en: 'A beautiful and elegant silver necklace perfect for any occasion.' },
        slug: 'elegant-silver-necklace',
        image: ['https://images.unsplash.com/photo-1599643478524-fb66f70a0066?w=500&q=80'],
        stock: 50,
        prices: {
          price: 120,
          originalPrice: 150,
          discount: 20
        },
        status: 'show',
        isFeatured: true
      },
      {
        sku: 'J-002',
        title: { en: 'Diamond Stud Earrings' },
        description: { en: 'Classic diamond stud earrings that add a touch of sparkle.' },
        slug: 'diamond-stud-earrings',
        image: ['https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=500&q=80'],
        stock: 30,
        prices: {
          price: 250,
          originalPrice: 300,
          discount: 15
        },
        status: 'show',
        isFeatured: true
      },
      {
        sku: 'J-003',
        title: { en: 'Gold Chain Bracelet' },
        description: { en: 'A simple yet stunning 18k gold chain bracelet.' },
        slug: 'gold-chain-bracelet',
        image: ['https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=500&q=80'],
        stock: 100,
        prices: {
          price: 85,
          originalPrice: 100,
          discount: 15
        },
        status: 'show',
        isFeatured: false
      },
      {
        sku: 'J-004',
        title: { en: 'Sapphire Ring' },
        description: { en: 'A gorgeous ring featuring a deep blue sapphire gemstone.' },
        slug: 'sapphire-ring',
        image: ['https://images.unsplash.com/photo-1605100804763-247f67b2548e?w=500&q=80'],
        stock: 15,
        prices: {
          price: 340,
          originalPrice: 340,
          discount: 0
        },
        status: 'show',
        isFeatured: true
      },
      {
        sku: 'J-005',
        title: { en: 'Rose Gold Watch' },
        description: { en: 'A luxurious rose gold women\'s watch with a minimalist face.' },
        slug: 'rose-gold-watch',
        image: ['https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=500&q=80'],
        stock: 45,
        prices: {
          price: 210,
          originalPrice: 280,
          discount: 25
        },
        status: 'show',
        isFeatured: false
      },
      {
        sku: 'J-006',
        title: { en: 'Pearl Drop Earrings' },
        description: { en: 'Elegant freshwater pearl drop earrings.' },
        slug: 'pearl-drop-earrings',
        image: ['https://images.unsplash.com/photo-1535632787350-4e68ef0ac584?w=500&q=80'],
        stock: 60,
        prices: {
          price: 75,
          originalPrice: 90,
          discount: 15
        },
        status: 'show',
        isFeatured: false
      },
      {
        sku: 'J-007',
        title: { en: 'Vintage Brooch' },
        description: { en: 'A unique vintage brooch adorned with crystals.' },
        slug: 'vintage-brooch',
        image: ['https://images.unsplash.com/photo-1602752250014-411a7bb7d5ce?w=500&q=80'],
        stock: 5,
        prices: {
          price: 45,
          originalPrice: 60,
          discount: 25
        },
        status: 'show',
        isFeatured: true
      },
      {
        sku: 'J-008',
        title: { en: 'Platinum Wedding Band' },
        description: { en: 'A sleek and durable platinum wedding band.' },
        slug: 'platinum-wedding-band',
        image: ['https://images.unsplash.com/photo-1515562141207-7a8ea3a1506b?w=500&q=80'],
        stock: 25,
        prices: {
          price: 450,
          originalPrice: 450,
          discount: 0
        },
        status: 'show',
        isFeatured: false
      }
    ];

    await Product.insertMany(products);
    console.log(`${products.length} products seeded successfully!`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding products:', error);
    process.exit(1);
  }
};

seedProducts();
