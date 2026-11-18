require('dotenv').config();
const mongoose = require('mongoose');

const ID = '6ac73f9a6cfb8509fbb55d3d';

(async () => {
    await mongoose.connect(process.env.DATABASE);
    const db = mongoose.connection.db;
    const oid = new mongoose.Types.ObjectId(ID);

    const collections = await db.listCollections().toArray();
    let found = false;

    for (const { name } of collections) {
        const col = db.collection(name);

        // 1) Kisi bhi collection me _id match
        const byId = await col.findOne({ _id: oid });
        if (byId) {
            found = true;
            console.log(`\n✅ _id mila: collection = "${name}"`);
            console.log(JSON.stringify(byId, null, 2));
        }

        // 2) Kisi field me ye id bata ke store hui he (reference)
        const docs = await col.find({}).limit(5000).toArray();
        for (const d of docs) {
            if (JSON.stringify(d).includes(ID) && String(d._id) !== ID) {
                found = true;
                console.log(`\n🔗 Reference mila: collection = "${name}", doc _id = ${d._id}`);
            }
        }
    }

    if (!found) console.log('Id kisi collection me nahi mili (shayad delete ho gayi, ya id code me generate hoti he).');
    await mongoose.disconnect();
    process.exit(0);
})();