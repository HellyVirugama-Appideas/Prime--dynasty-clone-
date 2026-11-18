const bcrypt = require('bcryptjs');
const createError = require('http-errors');

const SALT_ROUNDS = 10;

// "123-45-6789" / "123456789" -> "123456789"
exports.normalizeSSN = raw => {
    const digits = String(raw || '').replace(/\D/g, '');
    if (digits.length !== 9) {
        throw createError.BadRequest('Invalid SSN. 9 digits required (e.g. 123-45-6789).');
    }
    return digits;
};

// One-way hash. Raw SSN kahin save nahi hota.
exports.hashSSN = ssn => bcrypt.hash(ssn, SALT_ROUNDS);

exports.verifySSN = (ssn, hash) => bcrypt.compare(ssn, hash);

// "***-**-1234"
exports.maskSSN = last4 => (last4 ? `***-**-${last4}` : null);