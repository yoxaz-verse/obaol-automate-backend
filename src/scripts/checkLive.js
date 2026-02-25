const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://localhost:27017/obaol');
  const db = mongoose.connection;
  const col = db.collection('variantrates');
  const liveCount = await col.countDocuments({ isLive: true });
  console.log('Total isLive=true variantrates:', liveCount);
  const falseCount = await col.countDocuments({ isLive: false });
  console.log('Total isLive=false variantrates:', falseCount);
  process.exit(0);
}
main().catch(console.error);
