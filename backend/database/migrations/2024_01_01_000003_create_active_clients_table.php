<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('active_clients', function (Blueprint $table) {
            $table->id();
            $table->string('client_id')->unique();
            $table->string('channel_name');
            $table->string('client_ip')->nullable();
            $table->string('user_agent')->nullable();
            $table->string('username')->nullable();
            $table->timestamp('connected_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('active_clients');
    }
};
