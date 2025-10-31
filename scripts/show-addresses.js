require('dotenv').config();
const mongoose = require('mongoose');
const Address = require('../models/Address');

const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  console.error('MONGO_URI missing in .env');
  process.exit(1);
}

const userArg = process.argv[2];
if (!userArg) {
  console.error('Usage: node scripts/show-addresses.js user@example.com');
  process.exit(1);
}

async function run() {
  await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
  const doc = await Address.findOne({ userId: userArg }).lean();
  console.log('Address doc for', userArg, ':');
  console.dir(doc, { depth: 4 });
  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
