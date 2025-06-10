'use client';

import { useState } from 'react';
import Head from 'next/head';
import Map from '../components/Map';
import SightingForm from '../components/SightingForm';
import styles from '../styles/Home.module.css';

export default function Home() {
    const [showForm, setShowForm] = useState(false);
    const [shape, setShape] = useState('');
    const [dateRange, setDateRange] = useState('');

    return (
        <div className={styles.fullPage}>
            <Head>
                <title>UAP Marker</title>
            </Head>
            <header className={styles.header}>
                <h1 className={styles.logo}>UAP MARKER</h1>
                <nav>
                    <button className={styles.navButton} onClick={() => setShowForm(!showForm)}>
                        {showForm ? 'Close' : '+ Add Sighting'}
                    </button>
                </nav>
            </header>

            {showForm && <SightingForm onClose={() => setShowForm(false)} />}

            <Map shape={shape} dateRange={dateRange} />

            <footer className={styles.footer}>
                <select value={shape} onChange={(e) => setShape(e.target.value)} className={styles.filter}>
                    <option value="">All Shapes</option>
                    <option value="Light">Light</option>
                    <option value="Sphere">Sphere</option>
                    <option value="Triangle">Triangle</option>
                    <option value="Orb">Orb</option>
                    <option value="Cigar">Cigar</option>
                    <option value="Other">Other</option>
                </select>

                <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className={styles.filter}>
                    <option value="">All Dates</option>
                    <option value="24h">Last 24 Hours</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="365d">Last Year</option>
                </select>
            </footer>
        </div>
    );
}