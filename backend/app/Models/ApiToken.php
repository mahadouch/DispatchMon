<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ApiToken extends Model
{
    protected $fillable = ['token'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
