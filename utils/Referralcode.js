const User = require('../models/userModel');

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // confusing chars (0/O, 1/I) hata diye

// Unique referral code banata hai: naam ke 4 letters + 4 random (e.g. RAHU7K2M)
async function generateUniqueReferralCode(name) {
    const prefix = String(name || 'USER').replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4).padEnd(4, 'X');

    for (let attempt = 0; attempt < 10; attempt++) {
        let suffix = '';
        for (let k = 0; k < 4; k++) suffix += CHARS[Math.floor(Math.random() * CHARS.length)];
        const candidate = prefix + suffix;
        if (!(await User.exists({ myReferralCode: candidate }))) return candidate;
    }
    return null;
}

module.exports = { generateUniqueReferralCode };