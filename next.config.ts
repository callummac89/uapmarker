
/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
        ignoreDuringBuilds: true,
    },
    webpack(config) {
        config.module.rules.push({
            test: /\.geojson$/,
            type: 'json',
        });
        return config;
    },
};

module.exports = nextConfig;

export default nextConfig;

