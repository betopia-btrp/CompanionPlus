<?php

use App\Http\Controllers\Api\BlogController;
use Illuminate\Support\Facades\Route;

Route::get('/debug/blog-model', function () {
    try {
        $count = \App\Models\BlogPost::count();
        return ['status' => 'ok', 'count' => $count];
    } catch (\Exception $e) {
        return ['status' => 'error', 'message' => $e->getMessage()];
    }
});

Route::get('/debug/blog-tables', function () {
    try {
        $tables = \Illuminate\Support\Facades\Schema::getConnection()->getDoctrineSchemaManager()->listTableNames();
        return ['tables' => $tables];
    } catch (\Exception $e) {
        return ['status' => 'error', 'message' => $e->getMessage()];
    }
});