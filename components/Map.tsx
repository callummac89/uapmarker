// Always keep 'use client' at the very top for Next.js
'use client'

// Extracted function to initialize sightings source and layers
import type { LngLatLike } from 'mapbox-gl';
function initializeMapLayers(map: mapboxgl.Map) {
    // Set globe fog for space-like background
    map.setFog({
        color: 'black',
        'high-color': 'black',
        'space-color': '#0b0b0b',
        'star-intensity': 0.45
    });
    // Add sightings GeoJSON source (no clustering)
    if (!map.getSource('sightings')) {
        map.addSource('sightings', {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: []
            }
        });
    }

    // Unclustered points (no clustering, no cluster filters)
    if (!map.getLayer('unclustered-point')) {
        map.addLayer({
            id: 'unclustered-point',
            type: 'circle',
            source: 'sightings',
            paint: {
                'circle-color': '#00ffc3',
                'circle-radius': 6,
                'circle-stroke-width': 1,
                'circle-stroke-color': '#fff',
            }
        });
    }

    // Add heatmap layer (no cluster logic, use all points)
    if (!map.getLayer('sightings-heat')) {
        map.addLayer({
            id: 'sightings-heat',
            type: 'heatmap',
            source: 'sightings',
            maxzoom: 15,
            layout: {
                visibility: 'visible',
            },
            paint: {
                'heatmap-weight': [
                    'interpolate',
                    ['linear'],
                    ['get', 'count'],
                    1, 0,
                    10, 1
                ],
                'heatmap-intensity': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    0, 1,
                    15, 3
                ],
                'heatmap-color': [
                    'interpolate',
                    ['linear'],
                    ['heatmap-density'],
                    0, 'rgba(0, 0, 255, 0)',
                    0.2, 'royalblue',
                    0.4, 'cyan',
                    0.6, 'lime',
                    0.8, 'yellow',
                    1, 'red'
                ],
                'heatmap-radius': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    0, 2,
                    9, 20
                ],
                'heatmap-opacity': 0.6
            }
        });
        map.moveLayer('sightings-heat');
    }

    map.on('click', 'unclustered-point', (e) => {
        const feature = e.features && e.features[0];
        if (!feature || !feature.geometry || !(typeof feature.geometry === 'object' && feature.geometry !== null && feature.geometry.type === 'Point')) return;

        const props = feature.properties as {
            id: string;
            description: string;
            city: string;
            shape: string;
            date: string;
            noise: string;
            count: number;
            imageUrl: string;
            isHistorical?: string;
            historicalName?: string;
        };

        const formattedDate = new Date(props.date).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            hour12: true,
        });
        const popupHTML = props.isHistorical === 'true'
            ? `
              <div style="max-width: 300px; font-family: Georgia, serif; background: #000; color: #fff; padding: 14px; border: 2px solid #444; border-radius: 10px; box-shadow: 0 0 12px rgba(255,255,255,0.2);">
                <div style="font-size: 18px; font-weight: bold; color: #990000;">Historical Sighting</div>
                <div style="font-size: 16px; font-style: italic; margin-top: 6px;">${props.historicalName}</div>
                <div><strong>Date:</strong> ${formattedDate}</div>
                <div><strong>City:</strong> ${props.city}</div>
                <div><strong>Shape:</strong> ${props.shape}</div>
                <div><strong>Noise:</strong> ${props.noise}</div>
                <div><strong>Count:</strong> ${props.count}</div>
                <div style="margin-top: 8px;"><strong>Description:</strong><br>${props.description}</div>
              </div>
            `
            : `
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
            .setLngLat(feature.geometry.coordinates as LngLatLike)
            .setHTML(popupHTML)
            .addTo(map);
    });

    map.on('mouseenter', 'unclustered-point', () => {
        map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'unclustered-point', () => {
        map.getCanvas().style.cursor = '';
    });
}

import { useEffect, useRef, useState, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import styles from './Map.module.css';
import type { FeatureCollection, Point, Feature } from 'geojson';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlane, faMap, faRadiation } from '@fortawesome/free-solid-svg-icons';

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

// ExtendedSighting type for historical fields
type ExtendedSighting = Sighting & {
    isHistorical?: string;
    historicalName?: string;
};

type MapProps = {
    shape?: string;
    dateRange?: string;
    showAirports?: boolean;
    showHeatmap?: boolean;
    showForm?: boolean; // new prop
};


const UapMap = ({
    shape = 'all',
    dateRange = 'all',
    showAirports = false,
    showForm = false,
}: MapProps) => {
    const [showAirportsState, setShowAirports] = useState(showAirports);
    // Nuclear sites toggle state
    const [showNuclear, setShowNuclear] = useState(false);
    const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/dark-v10');
    const mapRef = useRef<HTMLDivElement>(null);
    const [sightings, setSightings] = useState<Sighting[]>([]);
    // Persist initial center/zoom across re-renders
    const initialCenterRef = useRef<[number, number]>([-98.47, 38.66]);
    const initialZoomRef = useRef<number>(4);
    // Store the map instance for later access in effects
    const mapInstanceRef = useRef<mapboxgl.Map | null>(null);

    useEffect((): void => {
        fetch('/api/sightings')
            .then(res => res.json())
            .then(data => {
                console.log('Fetched sightings:', data);
                setSightings(data);
            })
            .catch(err => console.error('Failed to fetch sightings:', err));
    }, []);


    const filteredSightings = useMemo(() => {
        if (!sightings || sightings.length === 0) return [];

        // Always explicitly default to 'all' for shape and dateRange
        const normalizedShape = shape && shape.trim().length > 0 ? shape.trim().toLowerCase() : 'all';

        // Use new switch block for startDate based on dateRange
        const now = new Date();
        let startDate: Date | null = null;

        switch (dateRange) {
            case '24hr':
                startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                break;
            case '7':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30':
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case '60':
                startDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
                break;
            case 'year':
                startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = null;
        }

        const filtered = sightings.filter(sighting => {
            const sightingDate = new Date(sighting.date);
            const sightingUTC = sightingDate.getTime();
            const startUTC = startDate ? startDate.getTime() : null;
            const shapeMatch = normalizedShape === 'all' || sighting.shape.toLowerCase() === normalizedShape;
            const withinDate = !startUTC || sightingUTC >= startUTC;
            return shapeMatch && withinDate;
        });

        console.debug('[Filtered Sightings]', filtered.length);
        return filtered;
    }, [sightings, shape, dateRange]);

    // Removed unused latestSightings and setLatestSightings logic

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


    // Only create the map instance on mount
    useEffect(() => {
        if (!mapRef.current) return;
        // Only create the map once
        if (mapInstanceRef.current) return;

        const map = new mapboxgl.Map({
            container: mapRef.current,
            style: mapStyle,
            center: initialCenterRef.current as LngLatLike,
            zoom: initialZoomRef.current,
            projection: 'globe',
        });
        mapInstanceRef.current = map;

        // Set center and zoom from refs (persisted)
        map.setCenter(initialCenterRef.current as LngLatLike);
        map.setZoom(initialZoomRef.current);

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
            map.resize();
            initializeMapLayers(map);
        });

        return () => {
            if (mapInstanceRef.current) {
                if (mapInstanceRef.current.getLayer('sightings-heat')) mapInstanceRef.current.removeLayer('sightings-heat');
                if (mapInstanceRef.current.getLayer('airport-points')) mapInstanceRef.current.removeLayer('airport-points');
                if (mapInstanceRef.current.getSource('airports')) mapInstanceRef.current.removeSource('airports');
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Update sightings data source when filteredSightings change
    useEffect(() => {
      const map = mapInstanceRef.current;
      if (!map) return;

      const updateSightings = () => {
        const source = map.getSource('sightings');
        if (!source) {
          console.warn('Sightings source not yet available');
          return;
        }

        const jitterIndexMap = new Map<string, number>();
        const geojsonSightings: FeatureCollection<Point> = {
          type: 'FeatureCollection',
          features: filteredSightings.map(sighting => {
            const key = `${sighting.latitude.toFixed(6)}_${sighting.longitude.toFixed(6)}`;
            const currentIndex = jitterIndexMap.get(key) ?? 0;
            jitterIndexMap.set(key, currentIndex + 1);
            const { latitude, longitude } = getJitteredCoord(sighting.latitude, sighting.longitude, currentIndex);
            const s = sighting as ExtendedSighting;
            return {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [longitude, latitude]
              },
              properties: {
                id: s.id,
                description: s.description,
                city: s.city,
                shape: s.shape,
                date: s.date,
                noise: s.noise,
                count: s.count,
                imageUrl: s.imageUrl,
                isHistorical: s.isHistorical,
                historicalName: s.historicalName,
              }
            };
          })
        };

        (source as mapboxgl.GeoJSONSource).setData(geojsonSightings);
        console.log('✅ Sightings source updated successfully');
      };

      if (map.isStyleLoaded()) {
        updateSightings();
      } else {
        const handleStyle = () => {
          updateSightings();
          map.off('styledata', handleStyle);
        };
        map.on('styledata', handleStyle);
        return () => {
          map.off('styledata', handleStyle);
        };
      }
    }, [filteredSightings]);

    // Show/hide airports on toggle
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;
        let removeMoveend: (() => void) | null = null;
        // const removed = false;
        // Airports update logic, only when showAirportsState changes
        const updateAirports = async () => {
            const messageId = 'zoom-in-message';
            if (map.getZoom() < 5) {
                if (!document.getElementById(messageId)) {
                    const msg = document.createElement('div');
                    msg.id = messageId;
                    msg.textContent = 'Zoom in to view airports';
                    Object.assign(msg.style, {
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        backgroundColor: 'rgba(0, 0, 0, 0.75)',
                        color: 'white',
                        padding: '10px 20px',
                        borderRadius: '8px',
                        fontSize: '15px',
                        zIndex: '999',
                        transition: 'opacity 0.5s ease-in-out',
                        opacity: '1',
                        backdropFilter: 'blur(6px)',
                        WebkitBackdropFilter: 'blur(6px)'
                    });
                    map.getContainer().appendChild(msg);
                    setTimeout(() => {
                        msg.style.opacity = '0';
                        setTimeout(() => {
                            msg.remove();
                        }, 500);
                    }, 2500);
                }
                // Too zoomed out — clear airports
                if (map.getSource('airports')) {
                    (map.getSource('airports') as mapboxgl.GeoJSONSource).setData({
                        type: 'FeatureCollection',
                        features: []
                    });
                }
                return;
            }

            const bounds = map?.getBounds();
            if (!bounds) return;

            const res = await fetch('/airports.geojson');
            const airportsData = await res.json();
            // Fix TS2532: Object is possibly 'undefined'
            if (!airportsData?.features || !Array.isArray(airportsData.features)) return;
            const featuresInBounds = (airportsData.features as Feature<Point>[]).filter((feature: Feature<Point>) => {
                const [lon, lat] = feature.geometry.coordinates;
                return bounds.contains([lon, lat]);
            });
            const visibleData: FeatureCollection<Point> = {
                type: 'FeatureCollection',
                features: featuresInBounds,
            };
            if (map.getSource('airports')) {
                (map.getSource('airports') as mapboxgl.GeoJSONSource).setData(visibleData);
            } else {
                map.addSource('airports', {
                    type: 'geojson',
                    data: visibleData,
                });
                map.addLayer({
                    id: 'airport-points',
                    type: 'circle',
                    source: 'airports',
                    paint: {
                        'circle-radius': 4,
                        'circle-color': '#3399ff',
                        'circle-stroke-width': 1,
                        'circle-stroke-color': '#fff',
                    }
                });
            }
        };

        if (showAirportsState) {
            updateAirports();
            const onMoveend = () => updateAirports();
            map.on('moveend', onMoveend);
            removeMoveend = () => {
                map.off('moveend', onMoveend);
            };
        } else {
            // Remove airport layer/source if present
            if (map.getLayer('airport-points')) map.removeLayer('airport-points');
            if (map.getSource('airports')) map.removeSource('airports');
        }
        return () => {
            if (removeMoveend) {
                removeMoveend();
            }
        };
    }, [showAirportsState]);


    // Show/hide nuclear sites layer
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;

        const updateNuclearSites = async () => {
            const response = await fetch('/data/nuclear-sites.geojson');
            const data = await response.json();

            if (!map.getSource('nuclear-sites')) {
                map.addSource('nuclear-sites', {
                    type: 'geojson',
                    data,
                });

                map.addLayer({
                    id: 'nuclear-points',
                    type: 'circle',
                    source: 'nuclear-sites',
                    paint: {
                        'circle-radius': 5,
                        'circle-color': '#ffcc00',
                        'circle-stroke-width': 1,
                        'circle-stroke-color': '#222'
                    },
                    layout: {
                        visibility: showNuclear ? 'visible' : 'none'
                    }
                });

                // Add popup and pointer interactivity for nuclear-points
                map.on('click', 'nuclear-points', (e) => {
                    const feature = e.features && e.features[0];
                    if (!feature || !feature.geometry || !(typeof feature.geometry === 'object' && feature.geometry !== null && feature.geometry.type === 'Point')) return;

                    const coordinates = feature.geometry.coordinates.slice();
                    const name = feature.properties?.name || 'Nuclear Site';

                    const popupHTML = `
                        <div style="max-width: 260px; font-family: sans-serif; background: #fff; color: #000; padding: 10px; border-radius: 6px;">
                            <strong>${name}</strong>
                        </div>
                    `;

                    new mapboxgl.Popup()
                        .setLngLat(coordinates as LngLatLike)
                        .setHTML(popupHTML)
                        .addTo(map);
                });
                // Change cursor to pointer on hover
                map.on('mouseenter', 'nuclear-points', () => {
                    map.getCanvas().style.cursor = 'pointer';
                });
                map.on('mouseleave', 'nuclear-points', () => {
                    map.getCanvas().style.cursor = '';
                });
            } else {
                map.setLayoutProperty(
                    'nuclear-points',
                    'visibility',
                    showNuclear ? 'visible' : 'none'
                );
            }
        };

        // Guard for map style readiness before updating nuclear sites
        if (!map.isStyleLoaded()) {
            const waitForStyle = () => {
                updateNuclearSites();
                map.off('styledata', waitForStyle);
            };
            map.on('styledata', waitForStyle);
            return;
        }
        updateNuclearSites();
    }, [showNuclear]);

    return (
        <>
            {!showForm && (
                <>
                    <div
                        style={{
                            position: 'absolute',
                            top: '80px',
                            left: '12px',
                            zIndex: 1000,
                            background: 'rgba(0,0,0,0.75)',
                            padding: '10px 12px',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            minWidth: '48px',
                            height: '48px',
                            width: '120px',
                        }}
                    >
                        <FontAwesomeIcon icon={faPlane} style={{ fontSize: '30px', color: '#fff', marginRight: '8px' }} />
                        <div style={{ flexGrow: 1, display: 'flex', justifyContent: 'flex-end' }}>
                            <label
                                style={{
                                    position: 'relative',
                                    display: 'inline-block',
                                    width: '44px',
                                    height: '24px',
                                    verticalAlign: 'middle',
                                    cursor: 'pointer',
                                    userSelect: 'none',
                                }}
                            >
                                <input
                                    type="checkbox"
                                    id="airportToggle"
                                    checked={showAirportsState}
                                    onChange={() => setShowAirports(!showAirportsState)}
                                    style={{
                                        opacity: 0,
                                        width: 0,
                                        height: 0,
                                    }}
                                />
                                {/* Track */}
                                <span
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        backgroundColor: showAirportsState ? '#00ffc3' : '#ccc',
                                        transition: 'background-color 0.3s',
                                        borderRadius: '24px',
                                        boxShadow: showAirportsState
                                            ? '0 0 2px #4fd1c5, 0 2px 8px rgba(79,209,197,0.15)'
                                            : '0 1px 4px rgba(0,0,0,0.15)',
                                    }}
                                />
                                {/* Thumb */}
                                <span
                                    style={{
                                        position: 'absolute',
                                        height: '18px',
                                        width: '18px',
                                        left: showAirportsState ? '23px' : '3px',
                                        bottom: '3px',
                                        backgroundColor: '#fff',
                                        transition: 'left 0.3s cubic-bezier(.4,2.2,.2,1), background-color 0.3s',
                                        borderRadius: '50%',
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                                    }}
                                />
                            </label>
                        </div>
                    </div>
                    {/* Terrain Toggle */}
                    <div
                        style={{
                            position: 'absolute',
                            top: '140px',
                            left: '12px',
                            zIndex: 1000,
                            background: 'rgba(0,0,0,0.75)',
                            padding: '10px 12px',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            minWidth: '48px',
                            height: '48px',
                            width: '120px',
                        }}
                    >
                        <FontAwesomeIcon icon={faMap} style={{ fontSize: '30px', color: '#fff', marginRight: '8px' }} />
                        <div style={{ flexGrow: 1, display: 'flex', justifyContent: 'flex-end' }}>
                            <label
                                style={{
                                    position: 'relative',
                                    display: 'inline-block',
                                    width: '44px',
                                    height: '24px',
                                    verticalAlign: 'middle',
                                    cursor: 'pointer',
                                    userSelect: 'none',
                                }}
                            >
                                <input
                                    type="checkbox"
                                    id="terrainToggle"
                                    checked={mapStyle === 'mapbox://styles/mapbox/satellite-v9'}
                                    onChange={() => {
                                        const map = mapInstanceRef.current;
                                        if (map) {
                                            const newStyle =
                                                map.getStyle()?.sprite?.includes('dark')
                                                    ? 'mapbox://styles/mapbox/satellite-v9'
                                                    : 'mapbox://styles/mapbox/dark-v10';
                                            map.setStyle(newStyle);
                                            setMapStyle(newStyle);
                                            map.once('styledata', () => {
                                                // Re-initialize map layers
                                                initializeMapLayers(map);
                                                // Restore sightings data after style change
                                                const source = map.getSource('sightings');
                                                if (source) {
                                                    const jitterIndexMap = new Map<string, number>();
                                                    const geojsonSightings: FeatureCollection<Point> = {
                                                        type: 'FeatureCollection',
                                                        features: filteredSightings.map(sighting => {
                                                            const key = `${sighting.latitude.toFixed(6)}_${sighting.longitude.toFixed(6)}`;
                                                            const currentIndex = jitterIndexMap.get(key) ?? 0;
                                                            jitterIndexMap.set(key, currentIndex + 1);
                                                            const { latitude, longitude } = getJitteredCoord(sighting.latitude, sighting.longitude, currentIndex);
                                                            return {
                                                                type: 'Feature',
                                                                geometry: { type: 'Point', coordinates: [longitude, latitude] },
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
                                                    (source as mapboxgl.GeoJSONSource).setData(geojsonSightings);
                                                }
                                            });
                                        }
                                    }}
                                    style={{
                                        opacity: 0,
                                        width: 0,
                                        height: 0,
                                    }}
                                />
                                <span
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        backgroundColor: mapStyle === 'mapbox://styles/mapbox/satellite-v9' ? '#00ffc3' : '#ccc',
                                        boxShadow: mapStyle === 'mapbox://styles/mapbox/satellite-v9'
                                            ? '0 0 2px #4fd1c5, 0 2px 8px rgba(79,209,197,0.15)'
                                            : '0 1px 4px rgba(0,0,0,0.15)',
                                        transition: 'background-color 0.3s',
                                        borderRadius: '24px',
                                    }}
                                />
                                <span
                                    style={{
                                        position: 'absolute',
                                        height: '18px',
                                        width: '18px',
                                        left: mapStyle === 'mapbox://styles/mapbox/satellite-v9' ? '23px' : '3px',
                                        bottom: '3px',
                                        backgroundColor: '#fff',
                                        transition: 'left 0.3s cubic-bezier(.4,2.2,.2,1), background-color 0.3s',
                                        borderRadius: '50%',
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                                    }}
                                />
                            </label>
                        </div>
                    </div>
                    {/* Nuclear Sites Toggle */}
                    <div
                        style={{
                            position: 'absolute',
                            top: '200px',
                            left: '12px',
                            zIndex: 1000,
                            background: 'rgba(0,0,0,0.75)',
                            padding: '10px 12px',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            minWidth: '48px',
                            height: '48px',
                            width: '120px',
                        }}
                    >
                        <FontAwesomeIcon icon={faRadiation} style={{ fontSize: '26px', color: '#fff', marginRight: '8px' }} />
                        <div style={{ flexGrow: 1, display: 'flex', justifyContent: 'flex-end' }}>
                            <label
                                style={{
                                    position: 'relative',
                                    display: 'inline-block',
                                    width: '44px',
                                    height: '24px',
                                    verticalAlign: 'middle',
                                    cursor: 'pointer',
                                    userSelect: 'none',
                                }}
                            >
                                <input
                                    type="checkbox"
                                    id="nuclearToggle"
                                    checked={showNuclear}
                                    onChange={() => setShowNuclear(prev => !prev)}
                                    style={{
                                        opacity: 0,
                                        width: 0,
                                        height: 0,
                                    }}
                                />
                                <span
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        backgroundColor: showNuclear ? '#00ffc3' : '#ccc',
                                        boxShadow: showNuclear
                                            ? '0 0 2px #4fd1c5, 0 2px 8px rgba(79,209,197,0.15)'
                                            : '0 1px 4px rgba(0,0,0,0.15)',
                                        transition: 'background-color 0.3s',
                                        borderRadius: '24px',
                                    }}
                                />
                                <span
                                    style={{
                                        position: 'absolute',
                                        height: '18px',
                                        width: '18px',
                                        left: showNuclear ? '23px' : '3px',
                                        bottom: '3px',
                                        backgroundColor: '#fff',
                                        transition: 'left 0.3s cubic-bezier(.4,2.2,.2,1), background-color 0.3s',
                                        borderRadius: '50%',
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                                    }}
                                />
                            </label>
                        </div>
                    </div>
                </>
            )}
            <div ref={mapRef} className={styles.mapContainer} />
        </>
    );
};

export default UapMap;