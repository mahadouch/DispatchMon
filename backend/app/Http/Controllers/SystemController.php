<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;

class SystemController extends Controller
{
    /**
     * GET /api/system
     * Infos système (CPU, RAM, disque)
     */
    public function index(): JsonResponse
    {
        $load = sys_getloadavg();
        $diskTotal = disk_total_space('/');
        $diskFree = disk_free_space('/');
        $diskUsed = $diskTotal - $diskFree;
        $memInfo = $this->getMemoryInfo();
        $cpuInfo = $this->getCpuInfo();

        return response()->json([
            'cpu' => [
                'model' => $cpuInfo['model'],
                'cores' => $cpuInfo['cores'],
                'threads' => $cpuInfo['threads'],
                'usage_percent' => $this->getCpuUsage(),
                'load_1m' => round($load[0], 2),
                'load_5m' => round($load[1], 2),
                'load_15m' => round($load[2], 2),
            ],
            'disk' => [
                'total' => $diskTotal,
                'free' => $diskFree,
                'used' => $diskUsed,
                'percent' => round(($diskUsed / $diskTotal) * 100, 1),
                'total_human' => $this->formatBytes($diskTotal),
                'used_human' => $this->formatBytes($diskUsed),
                'free_human' => $this->formatBytes($diskFree),
            ],
            'memory' => [
                'total' => $memInfo['total'],
                'used' => $memInfo['used'],
                'free' => $memInfo['free'],
                'percent' => $memInfo['percent'],
                'total_human' => $this->formatBytes($memInfo['total']),
                'used_human' => $this->formatBytes($memInfo['used']),
                'free_human' => $this->formatBytes($memInfo['free']),
            ],
            'php' => PHP_VERSION,
            'laravel' => app()->version(),
            'server' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown',
        ]);
    }

    private function getCpuInfo(): array
    {
        $model = 'Unknown';
        $cores = 0;
        $threads = 0;

        if (file_exists('/proc/cpuinfo')) {
            $cpuinfo = file_get_contents('/proc/cpuinfo');
            if (preg_match('/^model name\s*:\s*(.+)$/m', $cpuinfo, $m)) {
                $model = trim($m[1]);
            }
            if (preg_match('/^cpu cores\s*:\s*(\d+)$/m', $cpuinfo, $m)) {
                $cores = (int) $m[1];
            }
            if (preg_match('/^siblings\s*:\s*(\d+)$/m', $cpuinfo, $m)) {
                $threads = (int) $m[1];
            }
        }

        return ['model' => $model, 'cores' => $cores, 'threads' => $threads];
    }

    private function getCpuUsage(): float
    {
        if (!file_exists('/proc/stat')) {
            return 0.0;
        }

        // Lire les stats CPU deux fois avec un petit délai
        $stat1 = $this->readCpuStat();
        usleep(200000); // 200ms
        $stat2 = $this->readCpuStat();

        $totalDiff = $stat2['total'] - $stat1['total'];
        $idleDiff = $stat2['idle'] - $stat1['idle'];

        if ($totalDiff == 0) return 0.0;

        return round((1 - $idleDiff / $totalDiff) * 100, 1);
    }

    private function readCpuStat(): array
    {
        $line = '';
        $handle = fopen('/proc/stat', 'r');
        if ($handle) {
            $line = fgets($handle);
            fclose($handle);
        }

        $parts = preg_split('/\s+/', trim($line));
        // user, nice, system, idle, iowait, irq, softirq, steal
        $idle = (int)($parts[4] ?? 0) + (int)($parts[5] ?? 0);
        $total = array_sum(array_slice($parts, 1));

        return ['idle' => $idle, 'total' => $total];
    }

    private function getMemoryInfo(): array
    {
        if (file_exists('/proc/meminfo')) {
            $meminfo = file_get_contents('/proc/meminfo');
            $data = [];
            preg_match('/^MemTotal:\s+(\d+)\s+kB$/m', $meminfo, $match);
            $data['total'] = ($match[1] ?? 0) * 1024;
            preg_match('/^MemAvailable:\s+(\d+)\s+kB$/m', $meminfo, $match);
            $free = ($match[1] ?? 0) * 1024;
            $data['free'] = $free;
            $data['used'] = $data['total'] - $free;
            $data['percent'] = $data['total'] > 0 ? round(($data['used'] / $data['total']) * 100, 1) : 0;
            return $data;
        }

        $total = 512 * 1024 * 1024;
        return [
            'total' => $total,
            'used' => memory_get_usage(true),
            'free' => $total - memory_get_usage(true),
            'percent' => 0,
        ];
    }

    private function formatBytes(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $i = 0;
        $size = $bytes;
        while ($size >= 1024 && $i < count($units) - 1) {
            $size /= 1024;
            $i++;
        }
        return round($size, 1) . ' ' . $units[$i];
    }
}
