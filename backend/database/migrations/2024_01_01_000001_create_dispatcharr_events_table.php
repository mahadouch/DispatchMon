<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dispatcharr_events', function (Blueprint $table) {
            $table->id();
            $table->string('event_type')->index();
            $table->string('channel_name')->nullable();
            $table->string('stream_name')->nullable();
            $table->string('stream_url')->nullable();
            $table->string('provider_name')->nullable();
            $table->string('profile_used')->nullable();
            $table->string('client_ip')->nullable();
            $table->string('client_id')->nullable();
            $table->string('user_agent')->nullable();
            $table->string('username')->nullable();
            $table->float('runtime')->nullable();
            $table->bigInteger('total_bytes')->nullable();
            $table->float('duration')->nullable();
            $table->bigInteger('bytes_sent')->nullable();
            $table->string('error_type')->nullable();
            $table->text('error_message')->nullable();
            $table->string('reason')->nullable();
            $table->string('source_name')->nullable();
            $table->integer('programs')->nullable();
            $table->integer('channels_count')->nullable();
            $table->string('account_name')->nullable();
            $table->integer('streams_created')->nullable();
            $table->integer('streams_updated')->nullable();
            $table->integer('streams_deleted')->nullable();
            $table->string('content_name')->nullable();
            $table->string('content_uuid')->nullable();
            $table->json('raw_payload')->nullable();
            $table->timestamp('dispatcharr_timestamp')->nullable();
            $table->timestamps();

            $table->index(['event_type', 'created_at']);
            $table->index(['channel_name', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dispatcharr_events');
    }
};
