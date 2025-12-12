/**
 * Cache key patterns and TTL values
 */
const cacheKeys = {
    // Queue related
    QUEUE_SALON_ACTIVE: (salonId) => `queue:salon:${salonId}:active`,
    QUEUE_SALON_WAIT_TIME: (salonId) => `queue:salon:${salonId}:wait_time`,
    QUEUE_USER_STATUS: (userId) => `queue:user:${userId}:status`,

    // Salon related
    SALON_DETAILS: (salonId) => `salon:${salonId}:details`,
    SALON_SERVICES: (salonId) => `salon:${salonId}:services`,
    SALON_BARBERS: (salonId) => `salon:${salonId}:barbers`,
    SALONS_NEARBY: (lat, lng, radius) => `salons:nearby:${lat}:${lng}:${radius}`,

    // User related
    USER_PROFILE: (userId) => `user:${userId}:profile`,
    USER_SESSION: (userId) => `user:${userId}:session`,

    // OTP related
    OTP_VERIFY: (phoneNumber) => `otp:${phoneNumber}:verify`,
    OTP_ATTEMPTS: (phoneNumber) => `otp:${phoneNumber}:attempts`,

    // Rate limiting
    RATE_LIMIT: (ip, endpoint) => `rate:${ip}:${endpoint}`,

    // Analytics
    ANALYTICS_SALON_TODAY: (salonId) => `analytics:salon:${salonId}:today`
};

/**
 * Cache TTL values (in seconds)
 */
const cacheTTL = {
    QUEUE_ACTIVE: 120,           // 2 minutes
    QUEUE_WAIT_TIME: 60,         // 1 minute
    QUEUE_USER_STATUS: 30,       // 30 seconds
    SALON_DETAILS: 3600,         // 1 hour
    SALON_SERVICES: 1800,        // 30 minutes
    SALON_BARBERS: 900,          // 15 minutes
    SALONS_NEARBY: 300,          // 5 minutes
    USER_PROFILE: 1800,          // 30 minutes
    USER_SESSION: 86400,         // 24 hours
    OTP_VERIFY: 300,             // 5 minutes
    OTP_ATTEMPTS: 3600,          // 1 hour
    RATE_LIMIT: 60,              // 1 minute
    ANALYTICS: 3600              // 1 hour
};

module.exports = {
    cacheKeys,
    cacheTTL
};