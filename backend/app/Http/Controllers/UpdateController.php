<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Process;

class UpdateController extends Controller
{
    /**
     * POST /api/update
     * Pull le dernier code et redémarre le service
     */
    public function update(): JsonResponse
    {
        $logs = [];
        $basePath = base_path('..');

        // 1. Git pull
        $logs[] = ['step' => 'git pull', 'status' => 'running'];
        $git = Process::run("cd {$basePath} && git pull origin master 2>&1");
        $logs[] = [
            'step' => 'git pull',
            'status' => $git->successful() ? 'ok' : 'error',
            'output' => trim($git->output()),
        ];

        if (!$git->successful()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Échec du git pull',
                'logs' => $logs,
            ], 500);
        }

        // 2. Vérifier si le backend doit être rebuild
        $output = $git->output();
        $backendChanged = str_contains($output, 'backend/') || str_contains($output, 'Dockerfile') || str_contains($output, 'VERSION');
        if ($backendChanged) {
            $logs[] = ['step' => 'build backend', 'status' => 'running'];
            $build = Process::run("cd {$basePath} && docker compose build backend 2>&1");
            $logs[] = [
                'step' => 'build backend',
                'status' => $build->successful() ? 'ok' : 'error',
                'output' => $this->lastLines($build->output(), 10),
            ];
        } else {
            $logs[] = ['step' => 'build backend', 'status' => 'skip', 'output' => 'Pas de changement backend'];
        }

        // 3. Redémarrer les conteneurs
        $logs[] = ['step' => 'restart containers', 'status' => 'running'];
        $restart = Process::run("cd {$basePath} && docker compose up -d 2>&1");
        $logs[] = [
            'step' => 'restart containers',
            'status' => $restart->successful() ? 'ok' : 'error',
            'output' => trim($restart->output()),
        ];

        // 4. Attendre le démarrage
        $logs[] = ['step' => 'wait startup', 'status' => 'running'];
        sleep(3);
        $logs[] = ['step' => 'wait startup', 'status' => 'ok', 'output' => 'Backend prêt'];

        // 5. Migrations
        $logs[] = ['step' => 'migrations', 'status' => 'running'];
        $migrate = Process::run("cd {$basePath} && docker compose exec -T backend php artisan migrate --force 2>&1");
        $logs[] = [
            'step' => 'migrations',
            'status' => $migrate->successful() ? 'ok' : 'skip',
            'output' => trim($migrate->output()) ?: 'Nothing to migrate',
        ];

        return response()->json([
            'status' => 'ok',
            'message' => 'Mise à jour terminée avec succès',
            'logs' => $logs,
        ]);
    }

    private function lastLines(string $text, int $n): string
    {
        $lines = explode("\n", trim($text));
        return implode("\n", array_slice($lines, -$n));
    }
}
