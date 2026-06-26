<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

return new class extends Migration
{
    public function up(): void
    {
        // Créer users si pas encore présent
        if (!Schema::hasTable('users')) {
            Schema::create('users', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('email')->unique();
                $table->string('password');
                $table->string('role')->default('admin');
                $table->rememberToken();
                $table->timestamps();
            });
        } else {
            // Ajouter role si elle manque
            if (!Schema::hasColumn('users', 'role')) {
                Schema::table('users', function (Blueprint $table) {
                    $table->string('role')->default('admin')->after('password');
                });
            }
        }

        // Créer api_tokens si pas encore présent
        if (!Schema::hasTable('api_tokens')) {
            Schema::create('api_tokens', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->string('token', 64)->unique();
                $table->timestamps();
            });
        }

        // Créer admin par défaut si pas encore présent
        $exists = DB::table('users')->where('email', 'admin@dispatchmon.local')->exists();
        if (!$exists) {
            DB::table('users')->insert([
                'name' => 'Admin',
                'email' => 'admin@dispatchmon.local',
                'password' => Hash::make('password'),
                'role' => 'admin',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        DB::table('users')->where('email', 'admin@dispatchmon.local')->delete();
        Schema::dropIfExists('api_tokens');
        Schema::dropIfExists('users');
    }
};
