'use client';

import { useEffect, useState } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';

import SightingForm from '../components/SightingForm';
import LoadingScreen from '../components/LoadingScreen';
import styles from '../styles/Home.module.css';
import DateRangeSliderPanel from '../components/DateRangeSliderPanel';

const Map = dynamic(() => import('../components/Map'), { ssr: false });

export default function Home() {
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [dateRange, setDateRange] = useState('all');

    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 1500);

        fetch('/api/sightings')
            .then(res => res.json())
            .catch(err => console.error('Failed to fetch sightings count', err));

        return () => clearTimeout(timer);
    }, []);


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
                <nav>
                    <button className={styles.navButton} onClick={() => setShowForm(!showForm)}>
                        {showForm ? 'Close' : '+ Add Sighting'}
                    </button>
                </nav>
            </header>

            {showForm && <SightingForm onClose={() => setShowForm(false)} />}


            <DateRangeSliderPanel
                dateRange={dateRange}
                setDateRange={setDateRange}
            />

            <Map dateRange={dateRange} />

        </div>
    );
}