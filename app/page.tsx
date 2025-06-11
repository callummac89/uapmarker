'use client';

import { useEffect, useState } from 'react';
import Head from 'next/head';
import Map from '../components/Map';
import SightingForm from '../components/SightingForm';
import LoadingScreen from '../components/LoadingScreen';
import styles from '../styles/Home.module.css';

export default function Home() {
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [shape, setShape] = useState('all');
    const [dateRange, setDateRange] = useState('all');
    const [totalSightings, setTotalSightings] = useState<number | null>(null);
    const [showAirports, setShowAirports] = useState(false);
    const [showHeatmap, setShowHeatmap] = useState(false);

    useEffect(() => {
        console.log('Current shape:', shape);
        console.log('Current dateRange:', dateRange);
    }, [shape, dateRange]);

    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 1500);
        fetch('/api/sightings')
            .then(res => res.json())
            .then(data => setTotalSightings(data.length))
            .catch(err => console.error('Failed to fetch sightings count', err));
        return () => clearTimeout(timer);
    }, []);

    if (loading) return <LoadingScreen />;

    return (
        <div className={styles.fullPage}>
            <Head>
                <title>UAP Marker</title>
            </Head>
            <header className={styles.header}>
                <h1 className={styles.logo}>UAP MARKER</h1>
                {totalSightings !== null && (
                    <span className={styles.count}>{totalSightings} Sightings</span>
                )}
                <nav>
                    <button className={styles.navButton} onClick={() => setShowForm(!showForm)}>
                        {showForm ? 'Close' : '+ Add Sighting'}
                    </button>
                </nav>
            </header>

            {showForm && <SightingForm onClose={() => setShowForm(false)} />}

            <Map shape={shape} dateRange={dateRange} showAirports={showAirports} showHeatmap={showHeatmap} />

            <footer className={styles.footer}>
                <div className={styles.footerRow}>
                    <select value={shape} onChange={(e) => setShape(e.target.value)} className={styles.filter}>
                        <option value="all">All Shapes</option>
                        <option value="Light">Light</option>
                        <option value="Sphere">Sphere</option>
                        <option value="Triangle">Triangle</option>
                        <option value="Orb">Orb</option>
                        <option value="Cigar">Cigar</option>
                        <option value="Other">Other</option>
                    </select>

                    <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className={styles.filter}>
                        <option value="all">All Dates</option>
                        <option value="24h">Last 24 Hours</option>
                        <option value="7d">Last 7 Days</option>
                        <option value="30d">Last 30 Days</option>
                        <option value="365d">Last Year</option>
                    </select>
                </div>

                <div className={styles.footerToggles}>
                    <div className={styles.toggleWrapper}>
                        <span className={styles.toggleText}>Show Airports</span>
                        <div
                            className={`${styles.toggle} ${showAirports ? styles.active : ''}`}
                            onClick={() => setShowAirports(!showAirports)}
                        >
                            <div className={styles.toggleThumb} />
                        </div>
                    </div>
                    <div className={styles.toggleWrapper}>
                        <span className={styles.toggleText}>Show Heatmap</span>
                        <div
                            className={`${styles.toggle} ${showHeatmap ? styles.active : ''}`}
                            onClick={() => setShowHeatmap(!showHeatmap)}
                        >
                            <div className={styles.toggleThumb} />
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}