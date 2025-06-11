'use client';
import styles from './LoadingScreen.module.css';

export default function LoadingScreen() {
    return (
        <div className={styles.overlay}>
            <div className={styles.orbs}>
                <div className={styles.orb} />
                <div className={styles.orb} />
                <div className={styles.orb} />
                <div className={styles.orb} />
            </div>
        </div>
    );
}