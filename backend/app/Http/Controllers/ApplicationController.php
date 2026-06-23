<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ApplicationController extends Controller
{
    /**
     * List the active applications the authenticated user has access to.
     */
    public function index(Request $request): JsonResponse
    {
        $applications = $request->user()
            ->applications()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(fn ($app) => [
                'id' => $app->id,
                'slug' => $app->slug,
                'name' => $app->name,
                'description' => $app->description,
                'icon' => $app->icon,
                'url' => $app->url,
                'category' => $app->category,
                'color' => $app->color,
                'logo' => $app->logo,
                'keywords' => $app->keywords,
                'type' => $app->type,
                'sso_enabled' => $app->sso_enabled,
            ]);

        return response()->json($applications);
    }
}
