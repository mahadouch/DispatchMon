<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Process;

class UpdateController extends Controller
{
    /**
     * POST /api/update
     * Tente de faire l'update, sinon retourne la commande à exécuter
     */
    public function update(): JsonResponse
    {
        $logs = [];
        $hostPath = env('HOST_PATH', '/home/mahadouch/DispatchMon');

        // 1. Git pull
        $logs[] = ['step' => 'git pull', 'status' => 'running'];
        $git = Process::timeout(60)->run("git -C {$hostPath} pull origin master 2>&1");
        $gitOutput = trim($git->output());

        if (!$git->successful() && (str_contains($gitOutput, 'not a git') || str_contains($gitOutput, 'No such file'))) {
            // Le repo n'est pas accessible depuis le conteneur
            $logs[] = ['step' => 'git pull', 'status' => 'error', 'output' => 'Pas d\'accès au repo depuis le conteneur'];

            return response()->json([
                'status' => 'host_required',
                'message' => 'Mise à jour impossible depuis le conteneur. Exécutez la commande sur l\'hôte :',
                'command' => "cd {$hostPath} && git pull && docker compose up -d --build",
                'logs' => $logs,
            ]);
        }

        $logs[] = [
            'step' => 'git pull',
            'status' => $git->successful() ? 'ok' : 'error',
            'output' => $gitOutput ?: 'Already up to date',
        ];

        // 2. Build + restart
        $logs[] = ['step' => 'build & restart', 'status' => 'running'];
        $build = Process::timeout(180)->run("cd {$hostPath} && docker compose up -d --build 2>&1");
        $logs[] = [
            'step' => 'build & restart',
            'status' => $build->successful() ? 'ok' : 'error',
            'output' => $this->lastLines($build->output(), 10),
        ];

        // 3. Attendre
        sleep(3);
        $logs[] = ['step' => 'wait startup', 'status' => 'ok', 'output' => 'Services prêts'];

        // 4. Migrations
        $logs[] = ['step' => 'migrations', 'status' => 'running'];
        $migrate = Process::timeout(30)->run("cd {$hostPath} && docker compose exec -T backend php artisan migrate --force 2>&1");
        $logs[] = [
            'step' => 'migrations',
            'status' => $migrate->successful() ? 'ok' : 'skip',
            'output' => trim($migrate->output()) ?: 'Nothing to migrate',
        ];

        return response()->json([
            'status' => 'ok',
            'message' => 'Mise à jour terminée — rechargez la page',
            'logs' => $logs,
        ]);
    }

    private function lastLines(string $text, int $n): string
    {
        $lines = explode("\n", trim($text));
        return implode("\n", array_slice($lines, -$n));
    }
}
