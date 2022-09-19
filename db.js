import mongoose from 'mongoose';

const MONGODB_URI = `mongodb+srv://LeSavant:ENaDPbUAFd4Fn7NL@nodejs.s3v2en9.mongodb.net/?retryWrites=true&w=majority`;

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {console.log('Connected')}).catch((error) => {console.log('Error Connection', error)})

