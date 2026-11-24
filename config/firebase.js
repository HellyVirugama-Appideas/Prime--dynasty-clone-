const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// utils folder me service account JSON dhundo (naam kuch bhi ho)
function findServiceAccount() {
    const files = fs.readdirSync(__dirname).filter(f => f.toLowerCase().endsWith('.json'));

    for (const file of files) {
        try {
            const json = JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8'));
            if (json.type === 'service_account' && json.private_key && json.client_email) {
                console.log(`🔑 Firebase key file mili: utils/${file}`);
                return json;
            }
        } catch (e) {
            /* ye JSON service account nahi, aage badho */
        }
    }
    throw new Error('utils folder me Firebase service account JSON nahi mili.');
}

try {
    if (!admin.apps.length) {
        const serviceAccount = findServiceAccount();
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        console.log(`✅ Firebase initialized (project: ${serviceAccount.project_id})`);
    }
} catch (error) {
    console.error('❌ FIREBASE INIT FAILED:', error.message);
}

module.exports = admin;