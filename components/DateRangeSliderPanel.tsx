'use client';

import React from 'react';
import styles from '../styles/DateRangeSliderPanel.module.css';

interface Props {
    dateRange: string;
    setDateRange: (value: string) => void;
}

export default function DateRangeSliderPanel({ dateRange, setDateRange }: Props) {
    return (
        <div className={styles.sliderPanel}>
            <div className={styles.rangeSelector}>
                {['24hr', '7', '30', '60', 'year', 'all'].map(range => (
                    <button
                        key={range}
                        className={`${styles.button} ${dateRange === range ? styles.active : ''}`}
                        onClick={() => setDateRange(range)}
                    >
                        {range.toUpperCase()}
                    </button>
                ))}
            </div>
        </div>
    );
}