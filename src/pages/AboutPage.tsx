import { Database, Filter, Calculator, BarChart3, Code2, CheckCircle2, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

const PIPELINE_STEPS = [
  { icon: Database, label: 'Sources', desc: 'Airlines & OTAs' },
  { icon: Filter, label: 'Collection', desc: 'Responsible data gathering' },
  { icon: CheckCircle2, label: 'Cleaning', desc: 'Validation & deduplication' },
  { icon: Calculator, label: 'Aggregation', desc: 'Fare normalization' },
  { icon: BarChart3, label: 'Index', desc: 'APIx calculation' },
  { icon: Code2, label: 'Dashboard & API', desc: 'Analytics & REST API' },
  { icon: CheckCircle2, label: 'Validation', desc: 'Back-testing vs DGCA' },
];

export default function AboutPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero */}
      <Card className="p-8">
        <div className="flex items-center gap-3 mb-4">
          <img src="/apix-logo.svg" alt="APIx" className="w-12 h-12" />
          <div>
            <h2 className="text-3xl font-bold text-primaryText">APIx</h2>
            <p className="text-sm text-secondaryText">Automated Airfare Price Index</p>
          </div>
        </div>
        <p className="text-lg text-primaryText leading-relaxed max-w-3xl">
          India's Airfare Intelligence Platform — tracking the pulse of Indian airfares through
          continuous observation, statistical aggregation, and validated index methodology.
        </p>
        <div className="flex items-center gap-2 mt-4">
          <Badge variant="warning" dot>Prototype Dataset</Badge>
          <Badge variant="electric">Analytics Platform</Badge>
        </div>
      </Card>

      {/* Problem + Solution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="The Problem" />
          <CardBody>
            <p className="text-sm text-secondaryText leading-relaxed">
              Traditional and manual airfare collection methods may not fully reflect today's
              dynamic online airfare market. Prices change multiple times per day, vary by
              booking window, airline, route, and demand cycle. Without continuous, systematic
              observation, it becomes difficult to track real airfare movements, identify
              inflation trends, or compare fares across airlines and routes.
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="The Solution" />
          <CardBody>
            <p className="text-sm text-secondaryText leading-relaxed">
              APIx continuously observes online airfare prices from airline websites and OTA
              platforms, cleans and normalizes the data, and converts it into a statistically
              meaningful Airfare Price Index. The index tracks fare movements over time, enabling
              inflation analysis, lead-time optimization, route comparison, and airline benchmarking.
            </p>
          </CardBody>
        </Card>
      </div>

      {/* How It Works */}
      <Card>
        <CardHeader title="How It Works" subtitle="The complete data pipeline from observation to validation" />
        <CardBody>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {PIPELINE_STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-xl bg-navy-800 border border-borderColor flex items-center justify-center mb-2">
                    <Icon className="w-5 h-5 text-electric-light" />
                  </div>
                  <p className="text-xs font-medium text-primaryText">{step.label}</p>
                  <p className="text-[10px] text-secondaryText mt-0.5">{step.desc}</p>
                  {i < PIPELINE_STEPS.length - 1 && (
                    <ArrowRight className="w-3 h-3 text-navy-400 mt-1 hidden lg:block" />
                  )}
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      {/* Why It Matters */}
      <Card>
        <CardHeader title="Why It Matters" subtitle="Key benefits of the APIx platform" />
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: 'Higher-Frequency Intelligence', desc: 'Daily observations vs monthly reports — see fare movements as they happen.' },
              { title: 'Lead-Time Analysis', desc: 'Understand how booking windows affect fares and optimize purchase timing.' },
              { title: 'Route-Level Trends', desc: 'Track which routes are getting more or less expensive over time.' },
              { title: 'Airline-Level Trends', desc: 'Compare fare strategies across IndiGo, Air India, SpiceJet, Akasa, and others.' },
              { title: 'Inflation Indicators', desc: 'Measure airfare inflation with YoY and MoM metrics for economic analysis.' },
              { title: 'Data-Driven Policy Insights', desc: 'Support evidence-based aviation policy with systematic fare observation.' },
            ].map((item) => (
              <div key={item.title} className="p-3 rounded-lg bg-navy-900 border border-borderColor">
                <p className="text-sm font-medium text-primaryText mb-1">{item.title}</p>
                <p className="text-xs text-secondaryText leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Disclaimer */}
      <Card className="p-4 border-warning/30">
        <div className="flex items-start gap-3">
          <Badge variant="warning" dot>Important Notice</Badge>
          <p className="text-xs text-secondaryText leading-relaxed">
            APIx is a prototype/research platform. All data shown is demo/mock data generated for
            demonstration purposes. The index methodology is configurable and should ultimately
            follow the prescribed PSD/index methodology. Mock data should not be interpreted as
            official Indian government data. When actual permitted data sources are connected,
            the platform will display real observations with appropriate labeling.
          </p>
        </div>
      </Card>
    </div>
  );
}
