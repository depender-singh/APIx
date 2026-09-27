import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

interface Endpoint {
  method: 'GET' | 'POST';
  path: string;
  description: string;
  params?: { name: string; type: string; required: boolean; description: string }[];
  exampleResponse: string;
}

const ENDPOINTS: Endpoint[] = [
  {
    method: 'GET',
    path: '/api/v1/airfare-index/latest',
    description: 'Get the latest APIx index value with YoY and MoM changes.',
    exampleResponse: `{
  "date": "2026-09-12",
  "index": 124.63,
  "yoy_change": 6.42,
  "routes_observed": 25,
  "quotes": 18420
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/airfare-index?date=2026-09-10',
    description: 'Get APIx index value for a specific date.',
    params: [
      { name: 'date', type: 'string (YYYY-MM-DD)', required: true, description: 'The date to query' },
    ],
    exampleResponse: `{
  "date": "2026-09-10",
  "index": 122.18,
  "yoy_change": 5.87,
  "mom_change": 1.23,
  "observations_count": 3420
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/routes',
    description: 'List all observed routes with average fares and change percentages.',
    params: [
      { name: 'page', type: 'integer', required: false, description: 'Page number (default: 1)' },
      { name: 'limit', type: 'integer', required: false, description: 'Items per page (default: 20)' },
      { name: 'origin', type: 'string', required: false, description: 'Filter by origin airport code' },
    ],
    exampleResponse: `{
  "data": [
    {
      "route_code": "DEL-BOM",
      "avg_fare": 5420,
      "change_pct": 18.0,
      "observations": 342,
      "availability_rate": 78.4
    }
  ],
  "total": 25,
  "page": 1
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/routes/DEL-BOM',
    description: 'Get detailed information for a specific route.',
    params: [
      { name: 'route_code', type: 'string', required: true, description: 'Route code (e.g., DEL-BOM)' },
    ],
    exampleResponse: `{
  "route_code": "DEL-BOM",
  "origin": "DEL",
  "destination": "BOM",
  "avg_fare": 5420,
  "apix_contribution": 15,
  "change_pct": 18.0,
  "observations": 342,
  "airlines": ["IndiGo", "Air India", "SpiceJet"]
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/airlines',
    description: 'List all tracked airlines with fare statistics.',
    exampleResponse: `{
  "data": [
    {
      "name": "IndiGo",
      "code": "6E",
      "avg_fare": 5200,
      "routes": 22,
      "availability_rate": 82.3
    }
  ]
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/airlines/indigo',
    description: 'Get detailed statistics for a specific airline.',
    exampleResponse: `{
  "name": "IndiGo",
  "code": "6E",
  "avg_fare": 5200,
  "fare_change": 4.2,
  "routes_count": 22,
  "observations": 4200,
  "availability_rate": 82.3
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/lead-time',
    description: 'Get lead-time analysis data showing fare by advance booking window.',
    params: [
      { name: 'route', type: 'string', required: false, description: 'Filter by route code' },
      { name: 'airline', type: 'string', required: false, description: 'Filter by airline ID' },
    ],
    exampleResponse: `{
  "data": [
    { "advance_window": 1, "avg_fare": 8400 },
    { "advance_window": 7, "avg_fare": 5200 },
    { "advance_window": 15, "avg_fare": 3800 },
    { "advance_window": 30, "avg_fare": 3250 },
    { "advance_window": 45, "avg_fare": 3100 }
  ]
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/inflation',
    description: 'Get airfare inflation data (YoY and MoM changes).',
    exampleResponse: `{
  "data": [
    { "date": "2026-09-12", "yoy": 6.42, "mom": 1.23 }
  ]
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/backtesting',
    description: 'Get back-testing results comparing APIx with DGCA benchmark.',
    exampleResponse: `{
  "metrics": {
    "correlation": 0.91,
    "mae": 2.14,
    "directional_accuracy": 86.7,
    "bias": 0.84
  },
  "results": [
    { "date": "2026-09-12", "api_x": 124.63, "benchmark": 123.79 }
  ]
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/observations',
    description: 'Query raw airfare observations with filtering and pagination.',
    params: [
      { name: 'page', type: 'integer', required: false, description: 'Page number' },
      { name: 'limit', type: 'integer', required: false, description: 'Items per page' },
      { name: 'route', type: 'string', required: false, description: 'Filter by route' },
      { name: 'airline', type: 'string', required: false, description: 'Filter by airline' },
      { name: 'availability', type: 'string', required: false, description: 'Filter by availability' },
    ],
    exampleResponse: `{
  "data": [
    {
      "id": "obs1",
      "route_code": "DEL-BOM",
      "airline": "IndiGo",
      "travel_date": "2026-09-15",
      "advance_window": 3,
      "total_fare": 5420,
      "availability": "available"
    }
  ],
  "total": 18420,
  "page": 1
}`,
  },
];

const ERROR_RESPONSES = [
  { code: 400, message: 'Bad Request — Invalid parameters' },
  { code: 401, message: 'Unauthorized — API key required' },
  { code: 404, message: 'Not Found — Resource does not exist' },
  { code: 429, message: 'Rate Limited — Too many requests' },
  { code: 500, message: 'Internal Server Error' },
];

export default function ApiDocsPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState(0);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const ep = ENDPOINTS[selectedEndpoint];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-primaryText">API Documentation</h2>
        <p className="text-sm text-secondaryText mt-1">
          REST API for accessing APIx airfare index data, routes, airlines, and observations.
        </p>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="text-xs text-secondaryText mb-1">Base URL</p>
          <p className="text-sm font-mono text-electric-light">https://api.apix.in/api/v1</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-secondaryText mb-1">Authentication</p>
          <p className="text-sm text-primaryText">API Key (Bearer token)</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-secondaryText mb-1">Rate Limit</p>
          <p className="text-sm text-primaryText">1000 req/hour (free tier)</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Endpoint List */}
        <Card className="lg:col-span-1">
          <CardHeader title="Endpoints" subtitle={`${ENDPOINTS.length} available`} />
          <div className="divide-y divide-borderColor">
            {ENDPOINTS.map((e, i) => (
              <button
                key={i}
                onClick={() => setSelectedEndpoint(i)}
                className={`w-full text-left px-4 py-2.5 transition-colors ${
                  selectedEndpoint === i ? 'bg-electric/10' : 'hover:bg-navy-800/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Badge variant={e.method === 'GET' ? 'positive' : 'electric'}>{e.method}</Badge>
                  <span className={`text-xs font-mono truncate ${selectedEndpoint === i ? 'text-electric-light' : 'text-secondaryText'}`}>
                    {e.path}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Endpoint Detail */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader
              title={
                <div className="flex items-center gap-2">
                  <Badge variant="positive">{ep.method}</Badge>
                  <span className="font-mono text-sm">{ep.path}</span>
                </div> as unknown as string
              }
              subtitle={ep.description}
            />
            <CardBody className="space-y-4">
              {ep.params && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-secondaryText mb-2">Parameters</p>
                  <div className="space-y-2">
                    {ep.params.map((p) => (
                      <div key={p.name} className="flex items-start gap-3 p-2 rounded-lg bg-navy-900">
                        <div className="flex-shrink-0">
                          <span className="text-sm font-mono text-electric-light">{p.name}</span>
                          {p.required && <span className="text-negative text-xs ml-1">*</span>}
                        </div>
                        <div>
                          <p className="text-xs text-secondaryText">{p.type}</p>
                          <p className="text-xs text-secondaryText mt-0.5">{p.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-secondaryText">Example Response</p>
                  <button onClick={() => copyToClipboard(ep.exampleResponse, 'response')} className="btn-ghost text-xs p-1">
                    {copied === 'response' ? <Check className="w-3 h-3 text-positive" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
                <pre className="bg-navy-950 border border-borderColor rounded-lg p-3 text-xs font-mono text-teal-light overflow-x-auto">
                  {ep.exampleResponse}
                </pre>
              </div>
            </CardBody>
          </Card>

          {/* Try API */}
          <Card>
            <CardHeader title="Try API" subtitle="Send a test request (demo)" />
            <CardBody>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="positive">GET</Badge>
                <input className="input flex-1 font-mono text-xs" defaultValue={`https://api.apix.in${ep.path}`} readOnly />
                <button className="btn-primary text-xs">Send</button>
              </div>
              <pre className="bg-navy-950 border border-borderColor rounded-lg p-3 text-xs font-mono text-secondaryText overflow-x-auto">
                {`// Demo mode — API not yet deployed
// Response preview available in example above`}
              </pre>
            </CardBody>
          </Card>

          {/* Error Responses */}
          <Card>
            <CardHeader title="Error Responses" subtitle="Standard HTTP error codes" />
            <CardBody className="p-0">
              <div className="divide-y divide-borderColor">
                {ERROR_RESPONSES.map((err) => (
                  <div key={err.code} className="flex items-center gap-4 px-4 py-2.5">
                    <Badge variant={err.code >= 500 ? 'negative' : err.code >= 400 ? 'warning' : 'neutral'}>{err.code}</Badge>
                    <span className="text-sm text-secondaryText">{err.message}</span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
