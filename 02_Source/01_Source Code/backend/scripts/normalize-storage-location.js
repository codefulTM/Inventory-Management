#!/usr/bin/env node
/**
 * normalize-storage-location.js
 * Usage (POSIX): MONGODB_URI="mongodb://localhost:27017/your_db" node normalize-storage-location.js
 * Usage (Windows CMD): set MONGODB_URI=mongodb://localhost:27017/your_db && node normalize-storage-location.js
 *
 * This script trims and uppercases `storage_location` in `inventory_lots` and
 * replaces null/empty with 'UNASSIGNED'. It also creates indexes used by the
 * bin worklist.
 */

const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/inventory_management';

async function run() {
  console.log('Connecting to', uri);
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  const db = mongoose.connection.db;
  const coll = db.collection('inventory_lots');

  console.log('Normalizing storage_location (trim + uppercase)...');
  const res = await coll.updateMany({}, [
    {
      $set: {
        storage_location: {
          $cond: [
            { $in: [{ $trim: { input: '$storage_location' } }, [null, '', undefined]] },
            'UNASSIGNED',
            { $toUpper: { $trim: { input: '$storage_location' } } },
          ],
        },
      },
    },
  ]);

  console.log('Matched:', res.matchedCount, 'Modified:', res.modifiedCount);

  console.log('Creating indexes...');
  try {
    await coll.createIndex({ storage_location: 1 });
    await coll.createIndex({ storage_location: 1, modified_date: -1 });
    console.log('Indexes created.');
  } catch (err) {
    console.error('Index creation error:', err.message || err);
  }

  await mongoose.disconnect();
  console.log('Done.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
