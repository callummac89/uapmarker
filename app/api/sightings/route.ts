// File: app/api/sightings/route.ts
import { PrismaClient, Shape } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
    try {
        const data = await req.json();
        console.log("📥 Received submission:", data);

        const {
            date,
            city,
            latitude,
            longitude,
            noise,
            shape,
            count,
            description,
            imageUrl,
        } = data;

        // Validate presence and types of all fields
        if (
            !date || !city || !noise || !shape || !description ||
            typeof latitude !== 'number' ||
            typeof longitude !== 'number' ||
            typeof count !== 'number'
        ) {
            console.error("❌ Missing or invalid fields", {
                date, city, noise, shape, description, latitude, longitude, count
            });
            return new Response(JSON.stringify({ error: 'Missing or invalid fields' }), { status: 400 });
        }

        const sighting = await prisma.sighting.create({
            data: {
                date: new Date(date),
                city,
                latitude,
                longitude,
                noise,
                shape: shape as Shape,
                count,
                description,
                imageUrl,
            },
        });

        return new Response(JSON.stringify(sighting), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error("🔥 Submission error:", error);
        return new Response(JSON.stringify({ error: 'Failed to save sighting', details: error }), {
            status: 500,
        });
    }
}

export async function GET() {
    const sightings = await prisma.sighting.findMany({
        orderBy: { date: 'desc' },
        take: 200,
    });

    return new Response(JSON.stringify(sightings), {
        headers: { 'Content-Type': 'application/json' },
    });
}