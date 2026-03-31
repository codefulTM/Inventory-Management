import { Injectable, Logger } from '@nestjs/common';
import * as si from 'systeminformation';

export interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
    model: string;
  };
  memory: {
    total_gb: number;
    used_gb: number;
    available_gb: number;
    usage_percent: number;
  };
  disk: {
    total_gb: number;
    used_gb: number;
    available_gb: number;
    usage_percent: number;
  };
  services: {
    name: string;
    status: 'running' | 'stopped' | 'unknown';
  }[];
  timestamp: Date;
}

export interface AlertThresholds {
  cpu_percent: number;
  memory_percent: number;
  disk_percent: number;
}

/**
 * System Monitoring Service
 * Collects system metrics and triggers alerts when thresholds exceeded
 */
@Injectable()
export class SystemMonitoringService {
  private readonly logger = new Logger(SystemMonitoringService.name);
  private lastMetrics: SystemMetrics | null = null;
  private alerts: Array<{ timestamp: Date; type: string; message: string }> =
    [];
  private readonly maxAlerts = 100;

  private defaultThresholds: AlertThresholds = {
    cpu_percent: 80,
    memory_percent: 85,
    disk_percent: 90,
  };

  constructor() {
    this.logger.log('SystemMonitoringService initialized');
  }

  /**
   * Get current system metrics
   * @returns - Current system metrics (CPU, RAM, Disk, Services)
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    try {
      const now = new Date();

      // Get CPU info
      const cpuData = await si.cpu();
      const cpuUsage = await si.currentLoad();

      // Get memory info
      const memData = await si.mem();

      // Get disk info
      const diskData = await si.fsSize();
      const mainDisk = diskData[0];

      const metrics: SystemMetrics = {
        cpu: {
          usage: Math.round(cpuUsage.currentLoad * 100) / 100,
          cores: cpuData.cores,
          model: cpuData.brand,
        },
        memory: {
          total_gb: Math.round((memData.total / 1024 ** 3) * 100) / 100,
          used_gb: Math.round((memData.used / 1024 ** 3) * 100) / 100,
          available_gb: Math.round((memData.available / 1024 ** 3) * 100) / 100,
          usage_percent: Math.round((memData.used / memData.total) * 100),
        },
        disk: {
          total_gb: Math.round((mainDisk.size / 1024 ** 3) * 100) / 100,
          used_gb: Math.round((mainDisk.used / 1024 ** 3) * 100) / 100,
          available_gb:
            Math.round((mainDisk.available / 1024 ** 3) * 100) / 100,
          usage_percent: Math.round(mainDisk.use * 100) / 100,
        },
        services: [
          { name: 'MongoDB', status: 'running' },
          { name: 'Backend API', status: 'running' },
          { name: 'Frontend', status: 'running' },
        ],
        timestamp: now,
      };

      this.lastMetrics = metrics;
      this._checkThresholdsAndAlert(metrics);

      return metrics;
    } catch (error) {
      this.logger.error('Error collecting system metrics:', error);
      throw error;
    }
  }

  /**
   * Get cached metrics from last collection
   * @returns - Last collected metrics or null
   */
  getLastMetrics(): SystemMetrics | null {
    return this.lastMetrics;
  }

  /**
   * Get recent alerts
   * @param limit - Maximum number of alerts to return
   * @returns - Array of recent alerts
   */
  getRecentAlerts(
    limit: number = 20,
  ): Array<{ timestamp: Date; type: string; message: string }> {
    return this.alerts.slice(-limit);
  }

  /**
   * Internal: Check if metrics exceed thresholds and trigger alerts
   */
  private _checkThresholdsAndAlert(metrics: SystemMetrics): void {
    // Check CPU threshold
    if (metrics.cpu.usage > this.defaultThresholds.cpu_percent) {
      this._addAlert(
        'CPU_HIGH',
        `CPU usage is high: ${metrics.cpu.usage}% (threshold: ${this.defaultThresholds.cpu_percent}%)`,
      );
    }

    // Check memory threshold
    if (metrics.memory.usage_percent > this.defaultThresholds.memory_percent) {
      this._addAlert(
        'MEMORY_HIGH',
        `Memory usage is high: ${metrics.memory.usage_percent}% (threshold: ${this.defaultThresholds.memory_percent}%)`,
      );
    }

    // Check disk threshold
    if (metrics.disk.usage_percent > this.defaultThresholds.disk_percent) {
      this._addAlert(
        'DISK_HIGH',
        `Disk usage is high: ${metrics.disk.usage_percent}% (threshold: ${this.defaultThresholds.disk_percent}%)`,
      );
    }
  }

  /**
   * Internal: Add alert to history
   */
  private _addAlert(type: string, message: string): void {
    this.alerts.push({
      timestamp: new Date(),
      type,
      message,
    });

    // Keep only last N alerts
    if (this.alerts.length > this.maxAlerts) {
      this.alerts = this.alerts.slice(-this.maxAlerts);
    }

    this.logger.warn(`ALERT [${type}]: ${message}`);
  }

  /**
   * Get or set alert thresholds
   * @param thresholds - New thresholds (optional)
   * @returns - Current thresholds
   */
  setAlertThresholds(thresholds: Partial<AlertThresholds>): AlertThresholds {
    this.defaultThresholds = {
      ...this.defaultThresholds,
      ...thresholds,
    };
    this.logger.log('Alert thresholds updated:', this.defaultThresholds);
    return this.defaultThresholds;
  }

  /**
   * Get current alert thresholds
   * @returns - Current thresholds
   */
  getAlertThresholds(): AlertThresholds {
    return { ...this.defaultThresholds };
  }
}
