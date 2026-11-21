require('dotenv').config();
const mongoose = require('mongoose');
const { runProfileReminder } = require('./jobs/profileReminder');

(async () => {
    await mongoose.connect(process.env.MONGO_URI);
    const stats = await runProfileReminder({ force: true }); // force: signup wale din ki shart skip
    console.log(stats);
    await mongoose.disconnect();
    process.exit(0);
})();