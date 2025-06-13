'use client';

import { useEffect, useState } from 'react';
import Head from 'next/head';
import Map from '../components/Map';
import SightingForm from '../components/SightingForm';
import LoadingScreen from '../components/LoadingScreen';
import styles from '../styles/Home.module.css';
import DateRangeSliderPanel from '../components/DateRangeSliderPanel';

export default function Home() {
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [shape, setShape] = useState('all');
    const [dateRange, setDateRange] = useState('all');
    const [totalSightings, setTotalSightings] = useState<number | null>(null);
    const [showAirports, setShowAirports] = useState(false);
    const [showHeatmap, setShowHeatmap] = useState(false);


    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 1500);

        fetch('/api/sightings')
            .then(res => res.json())
            .then(data => {
                setTotalSightings(data.length);
            })
            .catch(err => console.error('Failed to fetch sightings count', err));

        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        console.log('Current shape:', shape);
        console.log('Current dateRange:', dateRange);
    }, [shape, dateRange]);

    if (loading) return <LoadingScreen />;

    return (
        <div className={styles.fullPage}>
            <Head>
                <title>UAP Marker</title>
                <link rel="icon" href="/logo.png" />
            </Head>
            <header className={styles.header}>
                <h1 className={styles.logo}>
                    <img src="/logo.png" alt="UAP Marker Logo" style={{ height: '20px', marginRight: '10px', verticalAlign: 'middle' }} />
                </h1>
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

            <Map
                shape={shape}
                dateRange={dateRange}
                showAirports={showAirports}
                showHeatmap={showHeatmap}
            />

            <DateRangeSliderPanel
                dateRange={dateRange}
                setDateRange={setDateRange}
            />

        </div>
    );
}