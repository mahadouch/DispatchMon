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
                'used' => memory_get_usage(true),
                'peak' => memory_get_peak_usage(true),
                'used_human' => $this->formatBytes(memory_get_usage(true)),
            ],
            'php' => PHP_VERSION,
            'laravel' => app()->version(),
            'server' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown',
        ]);
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
