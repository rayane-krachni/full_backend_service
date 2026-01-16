/**
 * Calculate distance between two GPS points in kilometers (Haversine formula)
 * @param {Object} point1 - { lat: number, lng: number }
 * @param {Object} point2 - { lat: number, lng: number }
 * @returns {number} Distance in kilometers
 */
const calculateDistance = (point1, point2) => {
  if (!point1 || !point2) return 0;
  
  const R = 6371; // Earth radius in km
  const dLat = toRad(point2.lat - point1.lat);
  const dLon = toRad(point2.lng - point1.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(point1.lat)) * 
    Math.cos(toRad(point2.lat)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Convert degrees to radians
 * @param {number} degrees 
 * @returns {number} radians
 */
const toRad = (degrees) => {
  return degrees * (Math.PI / 180);
};

/**
 * Validate GPS coordinates
 * @param {Object} coords - { lat: number, lng: number }
 * @returns {boolean}
 */
const isValidCoordinates = (coords) => {
  return (
    coords &&
    typeof coords.lat === 'number' && 
    typeof coords.lng === 'number' &&
    coords.lat >= -90 &&
    coords.lat <= 90 &&
    coords.lng >= -180 &&
    coords.lng <= 180
  );
};

/**
 * Format coordinates for MongoDB queries
 * @param {Object} coords - { lat: number, lng: number }
 * @returns {Array<number>} [longitude, latitude]
 */
const formatForMongo = (coords) => {
  if (!isValidCoordinates(coords)) {
    throw new Error('Invalid coordinates');
  }
  return [coords.lng, coords.lat];
};

/**
 * Calculate estimated travel time in minutes
 * @param {number} distanceKm 
 * @param {string} transportMode - 'driving'|'walking'|'biking'
 * @returns {number} minutes
 */
const estimateTravelTime = (distanceKm, transportMode = 'driving') => {
  const speed = {
    driving: 40, // km/h (urban traffic)
    walking: 5,
    biking: 15
  }[transportMode] || 40;
  
  return Math.round((distanceKm / speed) * 60);
};

const calculateETA = (start, end, transportType = 'driving') => {
  const distance = calculateDistance(start, end);
  const speed = {
    driving: 40, // km/h
    walking: 5,
    biking: 15
  }[transportType];
  
  return Math.round((distance / speed) * 60); // minutes
};


module.exports = {
  calculateDistance,
  isValidCoordinates,
  formatForMongo,
  estimateTravelTime,
  calculateETA
};