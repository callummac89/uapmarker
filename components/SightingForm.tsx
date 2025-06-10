'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './SightingForm.module.css';


type MapboxPlace = {
    id: string;
    place_name: string;
    center: [number, number];
};

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

export default function SightingForm({ onClose }: { onClose: () => void }) {
    const [form, setForm] = useState({
        date: '',
        location: '',
        latitude: '',
        longitude: '',
        noise: '',
        shape: 'Orb',
        count: 1,
        description: '',
        imageUrl: '',
    });
    const [status, setStatus] = useState('');

    // For location autocomplete
    const [citySuggestions, setCitySuggestions] = useState<MapboxPlace[]>([]);
    const [cityQuery, setCityQuery] = useState('');
    const cityInputRef = useRef<HTMLInputElement>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm({ ...form, [name]: value });
        if (name === 'location') {
            setCityQuery(value);
        }
    };

    // Fetch location suggestions as user types
    useEffect(() => {
        if (!cityQuery || cityQuery.length < 2) {
            setCitySuggestions([]);
            return;
        }
        let ignore = false;
        const fetchCities = async () => {
            try {
                const res = await fetch(
                    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(cityQuery)}.json?types=place,locality&access_token=${MAPBOX_TOKEN}&autocomplete=true&limit=5`
                );
                const data = await res.json();
                if (!ignore) {
                    setCitySuggestions(data.features || []);
                }
            } catch {
                setCitySuggestions([]);
            }
        };
        fetchCities();
        return () => {
            ignore = true;
        };
    }, [cityQuery]);

    // When user selects a location from the datalist, auto-fill lat/lng
    useEffect(() => {
        if (!form.location || citySuggestions.length === 0) return;
        // Find the location in suggestions that matches the input exactly
        const matched = citySuggestions.find(
            (feature) => feature.place_name === form.location
        );
        if (matched && matched.center && matched.center.length === 2) {
            const [lng, lat] = matched.center;
            setForm((prev) => ({
                ...prev,
                latitude: lat.toString(),
                longitude: lng.toString(),
            }));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.location]);

    const handleSubmit = async (
        e: React.ChangeEvent<HTMLFormElement>
    ) => {
        e.preventDefault();
        setStatus('Submitting...');

        const res = await fetch('/api/sightings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...form,
                latitude: parseFloat(form.latitude),
                longitude: parseFloat(form.longitude),
                count: parseInt(form.count as any),
            }),
        });

        if (res.ok) {
            setStatus('Sighting submitted ✅');
            setForm({ date: '', location: '', latitude: '', longitude: '', noise: '', shape: 'Orb', count: 1, description: '', imageUrl: '' });
            // Ping to warm cache and reload to update map
            await fetch('/api/sightings'); // Ping to warm cache
            window.location.reload();      // Reload to update map
        } else {
            setStatus('Error submitting ❌');
        }
    };

    return (
        <div
          className={styles.overlay}
          onClick={(e: React.MouseEvent<HTMLDivElement>) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className={styles.modal}>
                <button className={styles.closeBtn} onClick={onClose}>×</button>
                <h2 style={{ fontWeight: 'bold', paddingBottom: '1rem' }}>Report a Sighting</h2>
                <form onSubmit={handleSubmit} className={styles.form}>
                    <label>Date & Time</label>
                    <input type="datetime-local" name="date" value={form.date} onChange={handleChange} required className={styles.input} />

                    <label>Location</label>
                    <input
                        type="text"
                        name="location"
                        value={form.location}
                        onChange={handleChange}
                        required
                        className={styles.input}
                        list="city-suggestions"
                        autoComplete="off"
                        ref={cityInputRef}
                    />
                    <datalist id="city-suggestions">
                        {citySuggestions.map((feature: MapboxPlace) => (
                            <option key={feature.id} value={feature.place_name}>
                                {feature.place_name}
                            </option>
                        ))}
                    </datalist>

                    <label>Latitude</label>
                    <input type="number" name="latitude" value={form.latitude} onChange={handleChange} required className={styles.input} />

                    <label>Longitude</label>
                    <input type="number" name="longitude" value={form.longitude} onChange={handleChange} required className={styles.input} />

                    <label>Noise</label>
                    <input type="text" name="noise" value={form.noise} onChange={handleChange} required className={styles.input} />

                    <label>Shape</label>
                    <select name="shape" value={form.shape} onChange={handleChange} className={styles.select}>
                        <option>Light</option>
                        <option>Sphere</option>
                        <option>Triangle</option>
                        <option>Orb</option>
                        <option>Cigar</option>
                        <option>Other</option>
                    </select>

                    <label># of UAP</label>
                    <input type="number" name="count" value={form.count} onChange={handleChange} min={1} required className={styles.input} />

                    <label>Description</label>
                    <textarea name="description" value={form.description} onChange={handleChange} required className={styles.textarea} />

                    <button type="submit" className={styles.submitButton}>Submit</button>
                    <p className={styles.status}>{status}</p>

                </form>
            </div>
        </div>
    );
}