<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ConsultantProfile; // This imports the model, it doesn't define it
use Illuminate\Http\Request;

class ConsultantController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = ConsultantProfile::where('is_approved', true)->with('user');

            if ($request->filled('specialization')) {
                $query->where('specialization', 'like', '%' . $request->specialization . '%');
            }

            if ($request->filled('max_rate')) {
                $query->where('base_rate_bdt', '<=', $request->max_rate);
            }

            $consultants = $query->orderBy('average_rating', 'desc')->get();
            return response()->json($consultants);

        } catch (\Throwable $e) {
            return response()->json([
                'error' => 'Backend Error',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}