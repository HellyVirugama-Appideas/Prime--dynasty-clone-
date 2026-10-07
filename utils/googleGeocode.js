const axios = require('axios');

async function reverseGeocode(lat, lng) {
    if (!lat || !lng) return { city: undefined, country: undefined };

    const url = 'https://maps.googleapis.com/maps/api/geocode/json';
    const { data } = await axios.get(url, {
        params: {
            latlng: `${lat},${lng}`,
            key: process.env.GOOGLE_MAPS_API_KEY,
        },
    });

    if (!data.results || data.results.length === 0) {
        return { city: undefined, country: undefined };
    }

    const components = data.results[0].address_components;

    const cityComp = components.find(
        (c) =>
            c.types.includes('locality') ||
            c.types.includes('administrative_area_level_2')
    );
    const countryComp = components.find((c) => c.types.includes('country'));

    return {
        city: cityComp?.long_name,
        country: countryComp?.long_name,
    };
}

module.exports = { reverseGeocode };