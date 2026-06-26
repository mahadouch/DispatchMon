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

        // Mémoire système
        $memInfo = $this->getMemoryInfo();

        return response()->json([
            'cpu' => [
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

    private function getMemoryInfo(): array
    {
        // Essayer /proc/meminfo (Linux)
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

        // Fallback: php_uname
        $total = @php_uname('r') ? 512 * 1024 * 1024 : 0; // estimation
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
