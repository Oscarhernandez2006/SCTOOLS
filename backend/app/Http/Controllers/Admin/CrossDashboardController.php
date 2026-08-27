<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Application;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Symfony\Component\HttpFoundation\Response;

/**
 * Proxy de métricas ejecutivas de las apps externas.
 * Solo para admins de la suite; reenvía el secreto SSO para autenticar
 * la petición en cada app.
 */
class CrossDashboardController extends Controller
{
    private function authorizeAdmin(Request $request): void
    {
        abort_unless((bool) $request->user()->is_admin, Response::HTTP_FORBIDDEN, 'No autorizado');
    }

    private function fetchResumen(string $slug): array|null
    {
        $app = Application::where('slug', $slug)->where('is_active', true)->first();
        if (!$app) return null;

        $baseUrl = rtrim($app->url, '/');
        $secret = env('SSO_SHARED_SECRET', '');

        try {
            $res = Http::withHeaders(['X-SSO-Secret' => $secret])
                ->timeout(5)
                ->get("{$baseUrl}/api/resumen-ejecutivo");

            if ($res->successful()) {
                return $res->json();
            }
        } catch (\Throwable) {}

        return null;
    }

    public function sigcom(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);
        $data = $this->fetchResumen('sigcom');
        if (!$data) return response()->json(null, 204);
        return response()->json($data);
    }

    public function sigcompro(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);
        $data = $this->fetchResumen('sigcompro');
        if (!$data) return response()->json(null, 204);
        return response()->json($data);
    }
}
