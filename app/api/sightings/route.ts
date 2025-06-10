// File: app/api/sightings/route.ts
import { PrismaClient, Shape } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
    const data = await req.json();
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

    if (
        !date || !city || latitude == null || longitude == null ||
        !noise || !shape || count == null || !description
    ) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    try {
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