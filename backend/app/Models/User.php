<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use Notifiable;

    protected $fillable = ['name', 'email', 'password', 'role'];
    protected $hidden = ['password', 'remember_token'];

    protected $casts = [
        'password' => 'hashed',
    ];

    public function tokens()
    {
        return $this->hasMany(ApiToken::class);
    }

    public function createToken()
    {
        $token = bin2hex(random_bytes(32));
        $this->tokens()->create(['token' => $token]);
        return $token;
    }
}
