'use client'

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import styles from './Map.module.css';
import type { FeatureCollection, Point } from 'geojson';

console.log('Mapbox token:', process.env.NEXT_PUBLIC_MAPBOX_TOKEN);

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

type Sighting = {
    id: string;
    latitude: number;
    longitude: number;
    description: string;
    city: string;
    shape: string;
    date: string;
    noise: string;
    count: number;
    imageUrl: string;
};

type MapProps = {
    shape: string;
    dateRange: string;
};

type PointGeometry = {
    type: 'Point';
    coordinates: [number, number];
};

const UapMap = ({ shape, dateRange }: MapProps) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const [sightings, setSightings] = useState<Sighting[]>([]);

    useEffect(() => {
        fetch('/api/sightings')
            .then(res => res.json())
            .then(data => setSightings(data))
            .catch(err => console.error('Failed to fetch sightings:', err));
    }, []);

    const filteredSightings = (!shape && !dateRange)
        ? sightings
        : sightings.filter(sighting => {
            const sightingDate = new Date(sighting.date);
            const now = new Date();

            let dateMatch = true;
            if (dateRange === '24h') {
                dateMatch = sightingDate >= new Date(now.getTime() - 24 * 60 * 60 * 1000);
            } else if (dateRange === '7d') {
                dateMatch = sightingDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            } else if (dateRange === '30d') {
                dateMatch = sightingDate >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            } else if (dateRange === '365d') {
                dateMatch = sightingDate >= new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            }

            const shapeMatch = shape === 'all' || sighting.shape.toLowerCase() === shape.toLowerCase();

            return dateMatch && shapeMatch;
        });

    // Apply jitter to sightings with identical lat/lng to avoid overlap
    const coordCountMap = new Map<string, number>();

    // Parameters for jittering (in degrees)
    const jitterRadius = 0.0001; // about 11 meters

    filteredSightings.forEach((sighting) => {
        const key = `${sighting.latitude.toFixed(6)}_${sighting.longitude.toFixed(6)}`;
        const count = coordCountMap.get(key) ?? 0;
        coordCountMap.set(key, count + 1);
    });

    const getJitteredCoord = (lat: number, lng: number, index: number) => {
        if (index === 0) {
            return { latitude: lat, longitude: lng };
        }
        // Polar spiral distribution
        const angle = index * 137.508 * (Math.PI / 180); // golden angle in radians
        const radius = jitterRadius * Math.sqrt(index);
        const deltaLat = radius * Math.cos(angle);
        const deltaLng = radius * Math.sin(angle);
        return { latitude: lat + deltaLat, longitude: lng + deltaLng };
    };

    // Type guard to check if geometry is Point and coordinates are valid
    const isPointGeometry = (geometry: unknown): geometry is PointGeometry => {
        return typeof geometry === 'object' && geometry !== null &&
            (geometry as PointGeometry).type === 'Point' &&
            Array.isArray((geometry as PointGeometry).coordinates) &&
            (geometry as PointGeometry).coordinates.length === 2 &&
            typeof (geometry as PointGeometry).coordinates[0] === 'number' &&
            typeof (geometry as PointGeometry).coordinates[1] === 'number';
    };

    useEffect(() => {
        if (!mapRef.current) return;

        const jitterIndexMap = new Map<string, number>();

        // Convert filteredSightings to GeoJSON FeatureCollection with jitter applied
        const geojsonSightings: FeatureCollection<Point> = {
            type: 'FeatureCollection',
            features: filteredSightings.map(sighting => {
                const key = `${sighting.latitude.toFixed(6)}_${sighting.longitude.toFixed(6)}`;
                const currentIndex = jitterIndexMap.get(key) ?? 0;
                jitterIndexMap.set(key, currentIndex + 1);
                const { latitude, longitude } = getJitteredCoord(sighting.latitude, sighting.longitude, currentIndex);

                return {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [longitude, latitude]
                    },
                    properties: {
                        id: sighting.id,
                        description: sighting.description,
                        city: sighting.city,
                        shape: sighting.shape,
                        date: sighting.date,
                        noise: sighting.noise,
                        count: sighting.count,
                        imageUrl: sighting.imageUrl
                    }
                };
            })
        };

        const map = new mapboxgl.Map({
            container: mapRef.current,
            style: 'mapbox://styles/mapbox/dark-v10',
            center: [-98.47, 38.66],
            zoom: 4,
        });

        navigator.geolocation.getCurrentPosition(
            position => {
                const { latitude, longitude } = position.coords;
                map.setCenter([longitude, latitude]);
                map.setZoom(4);
            },
            error => {
                console.error('Error getting user location:', error);
            }
        );

        map.on('load', () => {
            // Add clustered GeoJSON source
            map.addSource('sightings', {
                type: 'geojson',
                data: geojsonSightings,
                cluster: true,
                clusterMaxZoom: 14,
                clusterRadius: 50
            });

            // Cluster circles
            map.addLayer({
                id: 'clusters',
                type: 'circle',
                source: 'sightings',
                filter: ['has', 'point_count'],
                paint: {
                    'circle-color': [
                        'step',
                        ['get', 'point_count'],
                        '#00ffc3',
                        10, '#00bfae',
                        50, '#00796b'
                    ],
                    'circle-radius': [
                        'step',
                        ['get', 'point_count'],
                        16,
                        10, 22,
                        50, 28
                    ]
                }
            });

            // Cluster count labels
            map.addLayer({
                id: 'cluster-count',
                type: 'symbol',
                source: 'sightings',
                filter: ['has', 'point_count'],
                layout: {
                    'text-field': '{point_count_abbreviated}',
                    'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
                    'text-size': 14
                },
                paint: {
                    'text-color': '#222'
                }
            });

            // Unclustered points
            map.addLayer({
                id: 'unclustered-point',
                type: 'circle',
                source: 'sightings',
                filter: ['!', ['has', 'point_count']],
                paint: {
                    'circle-color': '#00ffc3',
                    'circle-radius': 8,
                    'circle-stroke-width': 1,
                    'circle-stroke-color': '#fff'
                }
            });

            // Popup on unclustered point click
            map.on('click', 'unclustered-point', (e) => {
                const feature = e.features && e.features[0];
                if (!feature || !feature.geometry || !isPointGeometry(feature.geometry)) return;

                const props = feature.properties as {
                    id: string;
                    description: string;
                    city: string;
                    shape: string;
                    date: string;
                    noise: string;
                    count: number;
                    imageUrl: string;
                };

                const formattedDate = new Date(props.date).toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: 'numeric',
                    hour12: true,
                });
                const popupHTML = `
  <div style="max-width: 300px; font-family: sans-serif; background: #fff; color: #000; padding: 12px; border-radius: 8px; line-height: 1.4;">
    <div style="font-size: 16px; font-weight: bold; margin-bottom: 6px;">${props.city}</div>
    <div><strong>Date:</strong> ${formattedDate}</div>
    <div><strong>Shape:</strong> ${props.shape}</div>
    <div><strong>Noise:</strong> ${props.noise}</div>
    <div><strong>Count:</strong> ${props.count}</div>
    <div style="margin-top: 8px;"><strong>Description:</strong><br>${props.description}</div>
    ${
                    props.imageUrl
                        ? `<img src="${props.imageUrl}" alt="Sighting image" style="margin-top: 10px; width: 100%; border-radius: 4px;" />`
                        : ''
                }
  </div>
`;
                new mapboxgl.Popup()
                    .setLngLat(feature.geometry.coordinates)
                    .setHTML(popupHTML)
                    .addTo(map);
            });

            // Change cursor to pointer on hover
            map.on('mouseenter', 'unclustered-point', () => {
                map.getCanvas().style.cursor = 'pointer';
            });
            map.on('mouseleave', 'unclustered-point', () => {
                map.getCanvas().style.cursor = '';
            });

            // Zoom to cluster on cluster click
            map.on('click', 'clusters', (e) => {
                const features = map.queryRenderedFeatures(e.point, {
                    layers: ['clusters']
                });
                if (!features.length) return;

                const clusterIdRaw = features[0]?.properties?.cluster_id;
                const clusterId = Number(clusterIdRaw);
                if (!Number.isFinite(clusterId)) return;

                (map.getSource('sightings') as mapboxgl.GeoJSONSource).getClusterExpansionZoom(
                    clusterId,
                    (err, zoom) => {
                        if (err) return;
                        if (!features[0].geometry || !isPointGeometry(features[0].geometry)) return;
                        if (typeof zoom !== 'number' || !Number.isFinite(zoom)) return;

                        map.easeTo({
                            center: features[0].geometry.coordinates,
                            zoom
                        });
                    }
                );
            });
        });

        return () => map.remove();
    }, [filteredSightings]);

    return <div ref={mapRef} className={styles.mapContainer} />;
};

export default UapMap;