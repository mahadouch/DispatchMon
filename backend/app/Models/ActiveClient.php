<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ActiveClient extends Model
{
    protected $fillable = [
        'client_id', 'channel_name', 'client_ip',
        'user_agent', 'username', 'connected_at',
    ];

    protected $casts = [
        'connected_at' => 'datetime',
    ];
}
