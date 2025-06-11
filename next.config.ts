

/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
        ignoreDuringBuilds: true,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    webpack(config: any, _context: any) {
        config.module.rules.push({
            test: /\.geojson$/,
            type: 'json',
        });
        return config;
    },
};

module.exports = nextConfig;

export default nextConfig;

