/**
 * Demo seed data for local testing.
 * Run from backend folder: npm run seed
 *
 * Creates users @seed.campusconnect.test — password for all: Test@1234
 * Clears prior seed users + their listings, rides, and activity (by email pattern).
 */
import '../loadEnv.js';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.model.js';
import Listing from '../models/Listing.model.js';
import Ride from '../models/Ride.model.js';
import ActivityEvent from '../models/ActivityEvent.model.js';

const SEED_EMAIL_RE = /@seed\.campusconnect\.test$/i;
const DEMO_PASSWORD = 'Test@1234';

const seedUsers = [
  { name: 'Ali Khan', email: 'ali@seed.campusconnect.test', department: 'CS', year: 3, location: 'H-12' },
  { name: 'Sara Malik', email: 'sara@seed.campusconnect.test', department: 'EE', year: 2, location: 'H-8' },
  { name: 'Omar Sheikh', email: 'omar@seed.campusconnect.test', department: 'CS', year: 4, location: 'Off-campus' },
  { name: 'Hina Raza', email: 'hina@seed.campusconnect.test', department: 'BBA', year: 1, location: 'Girls hostel' },
  { name: 'Bilal Ahmed', email: 'bilal@seed.campusconnect.test', department: 'ME', year: 3, location: 'H-10' },
];

const img = (id) => `https://picsum.photos/id/${id}/800/600`;

async function run() {
  const mongoUri = String(process.env.MONGODB_URI || process.env.MONGO_URI || '').trim();
  if (!mongoUri) {
    console.error(
      'Missing MONGODB_URI (or MONGO_URI). Add it to backend/.env — same variable as the API server uses.'
    );
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  const existingSeedIds = await User.find({ email: SEED_EMAIL_RE }).select('_id').lean();
  const ids = existingSeedIds.map((u) => u._id);

  if (ids.length) {
    await ActivityEvent.deleteMany({ userId: { $in: ids } });
    await Listing.deleteMany({ seller: { $in: ids } });
    await Ride.deleteMany({ driver: { $in: ids } });
    await Ride.updateMany({}, { $pull: { passengers: { user: { $in: ids } } } });
    await User.deleteMany({ _id: { $in: ids } });
    console.log('Removed previous seed users and related data');
  }

  const hashed = await bcrypt.hash(DEMO_PASSWORD, 12);
  const createdUsers = [];

  for (const u of seedUsers) {
    const doc = await User.create({
      name: u.name,
      email: u.email,
      password: hashed,
      department: u.department,
      year: u.year,
      location: u.location,
      notifications: [
        {
          type: 'listing_interest',
          message: 'Someone is interested in your CS343 textbook listing.',
          link: '/marketplace',
          read: false,
          createdAt: new Date(),
        },
        {
          type: 'ride_confirmed',
          message: 'You are confirmed on a ride to SEECS tomorrow.',
          link: '/rides/browse',
          read: true,
          createdAt: new Date(),
        },
        {
          type: 'marketplace_activity',
          message: 'Your listing "Graphing calculator" is now live.',
          link: '/marketplace',
          read: false,
          createdAt: new Date(),
        },
      ],
    });
    createdUsers.push(doc);
    console.log('User:', u.email);
  }

  const [ali, sara, omar, hina, bilal] = createdUsers;

  // Cross-ratings so `by` always references a real user (trust fields stay consistent)
  const ratingPairs = [
    [sara, ali],
    [omar, sara],
    [hina, omar],
    [bilal, hina],
    [ali, bilal],
  ];
  for (const [target, from] of ratingPairs) {
    await User.findByIdAndUpdate(target._id, {
      $push: {
        ratingsReceived: {
          by: from._id,
          score: 5,
          comment: 'Great to work with on campus.',
          context: 'marketplace',
          createdAt: new Date(),
        },
      },
      $set: { trustScore: 5, totalRatings: 1 },
    });
  }

  const listingsData = [
    {
      seller: ali._id,
      category: 'textbook',
      title: 'Introduction to Algorithms (CLRS) — 3rd ed.',
      description: 'CS department standard. Minor highlighting on early chapters only. No missing pages.',
      courseCode: 'CS200',
      semester: 3,
      department: 'CS',
      listingType: 'sale',
      price: 4500,
      condition: 'Good',
      images: [img(24), img(25)],
      views: 42,
    },
    {
      seller: sara._id,
      category: 'textbook',
      title: 'Signals & Systems notes + past papers bundle',
      description: 'Scanned notes + 5 past midterms with solutions. PDFs on USB or Google Drive link after purchase.',
      courseCode: 'EE231',
      semester: 4,
      department: 'EE',
      listingType: 'sale',
      price: 800,
      condition: 'Digital',
      images: [img(26)],
      views: 18,
    },
    {
      seller: omar._id,
      category: 'textbook',
      title: 'Database Systems textbook — rent for Spring',
      description: 'Rent for one semester. Return by end of finals week.',
      courseCode: 'CS343',
      semester: 6,
      department: 'CS',
      listingType: 'rent',
      price: 1200,
      condition: 'Like new',
      images: [img(28), img(29)],
      views: 67,
    },
    {
      seller: hina._id,
      category: 'general',
      title: 'Desk lamp — LED, adjustable',
      description: 'Perfect for dorm. Warm and cool modes. Used one semester.',
      department: 'BBA',
      listingType: 'sale',
      price: 2200,
      condition: 'Excellent',
      images: [img(30)],
      views: 11,
    },
    {
      seller: bilal._id,
      category: 'general',
      title: 'Scientific calculator Casio fx-991EX',
      description: 'Allowed in most exams. Battery included.',
      department: 'ME',
      listingType: 'exchange',
      price: null,
      condition: 'Working',
      images: [img(31)],
      views: 33,
    },
    {
      seller: ali._id,
      category: 'general',
      title: 'Mini fridge 40L',
      description: 'Quiet compressor. Pickup from H-12 only.',
      department: 'CS',
      listingType: 'sale',
      price: 18500,
      condition: 'Used',
      images: [img(32)],
      views: 105,
    },
    {
      seller: sara._id,
      category: 'textbook',
      title: 'Linear Algebra — Gilbert Strang',
      description: 'Classic text. Some pencil notes in margins.',
      courseCode: 'MT104',
      semester: 2,
      department: 'EE',
      listingType: 'sale',
      price: 3200,
      condition: 'Good',
      images: [img(33)],
      views: 22,
    },
    {
      seller: omar._id,
      category: 'general',
      title: 'Ethernet cable + USB-C hub',
      description: 'Hub has HDMI + 2 USB-A. Great for laptops.',
      department: 'CS',
      listingType: 'sale',
      price: 3500,
      condition: 'Good',
      images: [img(34), img(35)],
      views: 9,
    },
  ];

  const listings = await Listing.insertMany(listingsData);
  console.log('Listings:', listings.length);

  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  tomorrow.setHours(8, 0, 0, 0);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  nextWeek.setHours(17, 30, 0, 0);

  const ridesData = [
    {
      driver: ali._id,
      originName: 'H-12 NUST',
      destName: 'SEECS',
      departureTime: tomorrow,
      seatsTotal: 3,
      seatsAvailable: 2,
      vehicleInfo: 'White Corolla',
      notes: 'Leaving sharp 8:10. Split fuel ~Rs 80.',
      recurring: { enabled: true, daysOfWeek: [1, 3, 5] },
      status: 'scheduled',
      passengers: [{ user: hina._id, status: 'confirmed' }],
    },
    {
      driver: sara._id,
      originName: 'Islamabad F-7',
      destName: 'NUST Main Gate',
      departureTime: nextWeek,
      seatsTotal: 4,
      seatsAvailable: 4,
      vehicleInfo: 'Suzuki Swift',
      notes: 'Weekend shopping run — can drop at campus.',
      recurring: { enabled: false, daysOfWeek: [] },
      status: 'scheduled',
      passengers: [],
    },
    {
      driver: omar._id,
      originName: 'SEECS',
      destName: 'Pindi Saddar',
      departureTime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      seatsTotal: 2,
      seatsAvailable: 1,
      vehicleInfo: 'Honda Civic',
      notes: 'Returning after Friday prayer.',
      recurring: { enabled: true, daysOfWeek: [5] },
      status: 'scheduled',
      passengers: [{ user: bilal._id, status: 'confirmed' }],
    },
    {
      driver: bilal._id,
      originName: 'H-10',
      destName: 'SMME lab block',
      departureTime: new Date(now.getTime() + 36 * 60 * 60 * 1000),
      seatsTotal: 3,
      seatsAvailable: 3,
      vehicleInfo: 'Mehran',
      notes: 'Lab days only.',
      recurring: { enabled: true, daysOfWeek: [2, 4] },
      status: 'scheduled',
      passengers: [],
    },
  ];

  const rides = await Ride.insertMany(ridesData);
  console.log('Rides:', rides.length);

  // Fix seatsAvailable for rides that have passengers
  for (const r of rides) {
    const confirmed = (r.passengers || []).filter((p) => p.status === 'confirmed').length;
    r.seatsAvailable = Math.max(0, r.seatsTotal - confirmed);
    if (r.seatsAvailable <= 0) r.status = 'full';
    await r.save();
  }

  const [l0, l1, , , , , , l7] = listings;
  const [r0, r1] = rides;

  const events = [
    { userId: hina._id, type: 'marketplace_listing_view', refModel: 'Listing', refId: l0._id, meta: { category: 'textbook', department: 'CS' } },
    { userId: hina._id, type: 'marketplace_search', meta: { search: 'algorithm', category: 'textbook', department: 'CS' } },
    { userId: bilal._id, type: 'ride_search', meta: { originName: 'H-12', destName: 'SEECS' } },
    { userId: bilal._id, type: 'ride_view', refModel: 'Ride', refId: r0._id, meta: { originName: r0.originName, destName: r0.destName } },
    { userId: sara._id, type: 'marketplace_listing_create', refModel: 'Listing', refId: l1._id, meta: { category: 'textbook' } },
    { userId: ali._id, type: 'ride_create', refModel: 'Ride', refId: r0._id, meta: { origin: r0.originName, dest: r0.destName } },
    { userId: hina._id, type: 'ride_join', refModel: 'Ride', refId: r0._id, meta: { originName: r0.originName, destName: r0.destName } },
    { userId: omar._id, type: 'marketplace_listing_view', refModel: 'Listing', refId: l7._id, meta: { category: 'general', department: 'CS' } },
    { userId: ali._id, type: 'ride_view', refModel: 'Ride', refId: r1._id, meta: { originName: r1.originName, destName: r1.destName } },
  ];

  await ActivityEvent.insertMany(events);
  console.log('Activity events:', events.length);

  console.log('\n--- Seed complete ---');
  console.log('Log in with any of:');
  seedUsers.forEach((u) => console.log(`  ${u.email} / ${DEMO_PASSWORD}`));
  console.log('\nListings, rides, notifications, and activity are ready to browse.\n');

  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
