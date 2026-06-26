<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('active_clients', function (Blueprint $table) {
            $table->boolean('is_paid')->default(false)->after('username');
            $table->string('country')->nullable()->after('is_paid');
            $table->string('country_code')->nullable()->after('country');
        });

        Schema::create('known_clients', function (Blueprint $table) {
            $table->id();
            $table->string('client_ip')->unique();
            $table->string('username')->nullable();
            $table->string('country')->nullable();
            $table->string('country_code')->nullable();
            $table->boolean('is_paid')->default(false);
            $table->timestamp('first_seen')->nullable();
            $table->timestamp('last_seen')->nullable();
            $table->integer('total_sessions')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::table('active_clients', function (Blueprint $table) {
            $table->dropColumn(['is_paid', 'country', 'country_code']);
        });
        Schema::dropIfExists('known_clients');
    }
};
