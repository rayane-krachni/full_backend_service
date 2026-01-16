const mongoose = require("mongoose");
mongoose.set('strictQuery', true)

const options = {
	useNewUrlParser: true,
	useUnifiedTopology: true,
	maxPoolSize: 10,
	readPreference: 'primary',
	serverSelectionTimeoutMS: 30000, // Wait 30s for server selection
	socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
	connectTimeoutMS: 30000, // Connection timeout
	retryWrites: true,
	retryReads: true,
  };
  

var db;

const connect = async () => {
	try {
		db = await mongoose.connect(process.env.DB_URL, options);
		console.log("MongoDB Connected");
	} catch (error) {
		console.log(error);
		process.exit(1);
	}
};

const get = () => {
	return db;
};

exports.getDB = get;
exports.connectDB = connect;
