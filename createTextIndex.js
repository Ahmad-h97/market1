import mongoose from 'mongoose';

const uri = 'mongodb+srv://ahmad:ahmadobal@cluster0.uwz5hkg.mongodb.net/marketDB?retryWrites=true&w=majority&appName=Cluster0';

const run = async () => {
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;

    // Create the text index on houses collection
    const result = await db.collection('houses').createIndex({
      title: 'text',
      description: 'text'
    });

    console.log('✅ Text index created:', result);
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to create index:', err);
    process.exit(1);
  }
};

run();
