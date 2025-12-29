import dbManager from '../database/DatabaseManager';
import CONSTANTS from '../config/constants';

class PatternDetector {
    /**
     * Analyze patient adherence patterns and generate risk score
     * @param {number} patientId - Patient ID
     * @returns {Object} Risk assessment with level, score, and alerts
     */
    async analyzePatient(patientId) {
        const alerts = [];
        let riskScore = 0;

        // Get recent adherence data (last 30 days)
        const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
        const logs = await dbManager.getAdherenceLogs(patientId, thirtyDaysAgo, Math.floor(Date.now() / 1000));

        // Pattern 1: Silence Pattern (24+ hours no interaction)
        const silenceAlert = await this.detectSilencePattern(logs);
        if (silenceAlert) {
            alerts.push(silenceAlert);
            riskScore += 2;
        }

        // Pattern 2: Consecutive Misses
        const consecutiveMissesAlert = this.detectConsecutiveMisses(logs);
        if (consecutiveMissesAlert) {
            alerts.push(consecutiveMissesAlert);
            riskScore += 2;
        }

        // Pattern 3: Inconsistent Timing
        const timingAlert = this.detectInconsistentTiming(logs);
        if (timingAlert) {
            alerts.push(timingAlert);
            riskScore += 1;
        }

        // Pattern 4: Side Effect Clustering
        const sideEffectAlert = await this.detectSideEffectClustering(patientId);
        if (sideEffectAlert) {
            alerts.push(sideEffectAlert);
            riskScore += 2;
        }

        // Pattern 5: Weekend Gaps
        const weekendAlert = this.detectWeekendGaps(logs);
        if (weekendAlert) {
            alerts.push(weekendAlert);
            riskScore += 1;
        }

        // Pattern 6: Sudden Stop
        const suddenStopAlert = this.detectSuddenStop(logs);
        if (suddenStopAlert) {
            alerts.push(suddenStopAlert);
            riskScore += 3;
        }

        // Determine risk level
        let riskLevel;
        if (riskScore === 0) {
            riskLevel = CONSTANTS.RISK_LEVELS.GREEN;
        } else if (riskScore <= 3) {
            riskLevel = CONSTANTS.RISK_LEVELS.YELLOW;
        } else {
            riskLevel = CONSTANTS.RISK_LEVELS.RED;
        }

        return {
            riskLevel: riskLevel.level,
            riskScore,
            alerts,
            lastAnalyzed: Date.now()
        };
    }

    /**
     * Detect silence pattern - no interaction for 24+ hours
     */
    async detectSilencePattern(logs) {
        if (logs.length === 0) return null;

        const lastLog = logs[0]; // Most recent log
        const hoursSinceLastLog = (Date.now() / 1000 - lastLog.created_at) / 3600;

        if (hoursSinceLastLog >= CONSTANTS.RISK_THRESHOLDS.SILENCE_HOURS) {
            return {
                type: 'silence',
                severity: 'high',
                message: `No activity for ${Math.floor(hoursSinceLastLog)} hours`,
                details: `Last interaction was ${Math.floor(hoursSinceLastLog)} hours ago`
            };
        }

        return null;
    }

    /**
     * Detect consecutive missed doses
     */
    detectConsecutiveMisses(logs) {
        let consecutiveMisses = 0;
        let maxConsecutiveMisses = 0;

        for (const log of logs) {
            if (log.status === 'missed' || log.status === 'unwell') {
                consecutiveMisses++;
                maxConsecutiveMisses = Math.max(maxConsecutiveMisses, consecutiveMisses);
            } else if (log.status === 'taken') {
                consecutiveMisses = 0;
            }
        }

        if (maxConsecutiveMisses >= CONSTANTS.RISK_THRESHOLDS.CONSECUTIVE_MISSES) {
            return {
                type: 'consecutive_misses',
                severity: 'high',
                message: `${maxConsecutiveMisses} consecutive doses missed`,
                details: `Patient has missed ${maxConsecutiveMisses} doses in a row`
            };
        }

        return null;
    }

    /**
     * Detect inconsistent timing - taking medicines at random hours
     */
    detectInconsistentTiming(logs) {
        const timingVariances = {};

        logs.forEach(log => {
            if (log.status === 'taken' && log.actual_time && log.scheduled_time) {
                const variance = Math.abs(log.actual_time - log.scheduled_time) / 3600; // Hours
                const medicineId = log.medicine_id;

                if (!timingVariances[medicineId]) {
                    timingVariances[medicineId] = [];
                }
                timingVariances[medicineId].push(variance);
            }
        });

        // Check if average variance is > 2 hours
        for (const medicineId in timingVariances) {
            const variances = timingVariances[medicineId];
            const avgVariance = variances.reduce((a, b) => a + b, 0) / variances.length;

            if (avgVariance > 2 && variances.length >= 3) {
                return {
                    type: 'inconsistent_timing',
                    severity: 'medium',
                    message: 'Taking medicines at inconsistent times',
                    details: `Average delay of ${avgVariance.toFixed(1)} hours from scheduled time`
                };
            }
        }

        return null;
    }

    /**
     * Detect side effect clustering - multiple "felt unwell" reports
     */
    async detectSideEffectClustering(patientId) {
        const symptoms = await dbManager.getPatientSymptoms(patientId, 7);

        if (symptoms.length >= 3) {
            return {
                type: 'side_effects',
                severity: 'high',
                message: `${symptoms.length} side effects reported in last 7 days`,
                details: 'Patient has reported feeling unwell multiple times'
            };
        }

        return null;
    }

    /**
     * Detect weekend gaps - pattern of missing on weekends
     */
    detectWeekendGaps(logs) {
        const weekendMisses = logs.filter(log => {
            const date = new Date(log.scheduled_time * 1000);
            const dayOfWeek = date.getDay();
            return (dayOfWeek === 0 || dayOfWeek === 6) && (log.status === 'missed');
        });

        const weekdayMisses = logs.filter(log => {
            const date = new Date(log.scheduled_time * 1000);
            const dayOfWeek = date.getDay();
            return (dayOfWeek >= 1 && dayOfWeek <= 5) && (log.status === 'missed');
        });

        // If weekend miss rate is significantly higher than weekday
        if (weekendMisses.length >= 4 && weekendMisses.length > weekdayMisses.length * 1.5) {
            return {
                type: 'weekend_gaps',
                severity: 'medium',
                message: 'Frequently missing doses on weekends',
                details: 'Pattern suggests work/travel disruption on weekends'
            };
        }

        return null;
    }

    /**
     * Detect sudden stop - good adherence followed by sudden stop
     */
    detectSuddenStop(logs) {
        if (logs.length < 10) return null;

        // Check last 3 days
        const threeDaysAgo = Math.floor(Date.now() / 1000) - (3 * 24 * 60 * 60);
        const recentLogs = logs.filter(log => log.scheduled_time >= threeDaysAgo);
        const recentMisses = recentLogs.filter(log => log.status === 'missed').length;

        // Check previous 5 days before that
        const eightDaysAgo = Math.floor(Date.now() / 1000) - (8 * 24 * 60 * 60);
        const previousLogs = logs.filter(log =>
            log.scheduled_time >= eightDaysAgo && log.scheduled_time < threeDaysAgo
        );
        const previousTaken = previousLogs.filter(log => log.status === 'taken').length;

        // If good adherence before (80%+) but now missing most doses
        const previousAdherenceRate = previousLogs.length > 0 ? previousTaken / previousLogs.length : 0;
        const recentMissRate = recentLogs.length > 0 ? recentMisses / recentLogs.length : 0;

        if (previousAdherenceRate >= 0.8 && recentMissRate >= 0.7) {
            return {
                type: 'sudden_stop',
                severity: 'critical',
                message: 'Sudden stop after good adherence',
                details: `Was ${Math.round(previousAdherenceRate * 100)}% adherent, now missing most doses`
            };
        }

        return null;
    }

    /**
     * Get adherence statistics for a patient
     */
    async getAdherenceStats(patientId, days = 7) {
        const startDate = Math.floor(Date.now() / 1000) - (days * 24 * 60 * 60);
        const logs = await dbManager.getAdherenceLogs(patientId, startDate, Math.floor(Date.now() / 1000));

        const total = logs.length;
        const taken = logs.filter(log => log.status === 'taken').length;
        const missed = logs.filter(log => log.status === 'missed').length;
        const unwell = logs.filter(log => log.status === 'unwell').length;

        return {
            total,
            taken,
            missed,
            unwell,
            adherenceRate: total > 0 ? (taken / total) * 100 : 0,
            missRate: total > 0 ? (missed / total) * 100 : 0
        };
    }
}

const patternDetector = new PatternDetector();
export default patternDetector;
