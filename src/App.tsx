import { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import OverviewDashboard from '@/pages/OverviewDashboard';
import RoutesPage from '@/pages/RoutesPage';
import RouteDetailsPage from '@/pages/RouteDetailsPage';
import AirlinesPage from '@/pages/AirlinesPage';
import AirlineDetailsPage from '@/pages/AirlineDetailsPage';
import LeadTimePage from '@/pages/LeadTimePage';
import InflationPage from '@/pages/InflationPage';
import HistoricalPage from '@/pages/HistoricalPage';
import FestivalsPage from '@/pages/FestivalsPage';
import FareCompositionPage from '@/pages/FareCompositionPage';
import AvailabilityPage from '@/pages/AvailabilityPage';
import BacktestingPage from '@/pages/BacktestingPage';
import DataExplorerPage from '@/pages/DataExplorerPage';
import ApiDocsPage from '@/pages/ApiDocsPage';
import AboutPage from '@/pages/AboutPage';
import AdminDashboard from '@/pages/AdminDashboard';
import AdminCollectionPage from '@/pages/AdminCollectionPage';
import AdminQualityPage from '@/pages/AdminQualityPage';
import AdminRawPage from '@/pages/AdminRawPage';
import AdminConfigPage from '@/pages/AdminConfigPage';
import AdminWeightsPage from '@/pages/AdminWeightsPage';
import type { PageKey, DateRange } from '@/types';

const PAGE_TITLES: Record<PageKey, { title: string; subtitle: string }> = {
  overview: { title: 'Overview Dashboard', subtitle: 'Real-time and historical intelligence on domestic airfare movements in India.' },
  routes: { title: 'Routes', subtitle: 'All observed domestic air routes.' },
  'route-details': { title: 'Route Details', subtitle: 'Detailed fare analytics for a single route.' },
  airlines: { title: 'Airlines', subtitle: 'Comparative airline fare analysis.' },
  'airline-details': { title: 'Airline Details', subtitle: 'Detailed analytics for a single airline.' },
  'lead-time': { title: 'Lead-Time Analysis', subtitle: 'How advance booking windows affect fares.' },
  inflation: { title: 'Airfare Inflation', subtitle: 'Year-over-year and month-over-month inflation.' },
  historical: { title: 'Historical APIx', subtitle: 'Complete historical index data.' },
  festivals: { title: 'Festival & Demand Analysis', subtitle: 'Airfare changes during high-demand periods.' },
  'fare-composition': { title: 'Fare Composition', subtitle: 'Breakdown of airfare components.' },
  availability: { title: 'Availability', subtitle: 'Flight availability tracking.' },
  backtesting: { title: 'Back-testing', subtitle: 'APIx validation against DGCA benchmark.' },
  'data-explorer': { title: 'Data Explorer', subtitle: 'Inspect individual airfare observations.' },
  'api-docs': { title: 'API Documentation', subtitle: 'REST API reference and developer docs.' },
  about: { title: 'About APIx', subtitle: 'Automated Airfare Price Index platform.' },
  'admin-dashboard': { title: 'Admin Dashboard', subtitle: 'System overview and health monitoring.' },
  'admin-collection': { title: 'Collection Monitor', subtitle: 'Data collection source status.' },
  'admin-quality': { title: 'Data Quality', subtitle: 'Data quality monitoring and pipeline.' },
  'admin-raw': { title: 'Raw Observations', subtitle: 'Inspect raw scraped observations.' },
  'admin-config': { title: 'Index Configuration', subtitle: 'Configure APIx calculation methodology.' },
  'admin-weights': { title: 'Route & Weights', subtitle: 'Manage representative route basket and weights.' },
};

function App() {
  const [currentPage, setCurrentPage] = useState<PageKey>('overview');
  const [pageParams, setPageParams] = useState<Record<string, string>>({});
  const [sidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>('30d');

  const handleNavigate = (page: PageKey, params?: Record<string, string>) => {
    setCurrentPage(page);
    setPageParams(params || {});
    setMobileSidebarOpen(false);
    window.scrollTo(0, 0);
  };

  const handleBack = () => {
    if (currentPage === 'route-details') handleNavigate('routes');
    else if (currentPage === 'airline-details') handleNavigate('airlines');
  };

  const { title, subtitle } = PAGE_TITLES[currentPage];

  const renderPage = () => {
    switch (currentPage) {
      case 'overview':
        return <OverviewDashboard onNavigate={handleNavigate} dateRange={dateRange} />;
      case 'routes':
        return <RoutesPage onNavigate={handleNavigate} dateRange={dateRange} />;
      case 'route-details':
        return <RouteDetailsPage routeCode={pageParams.route || 'DEL-BOM'} onBack={handleBack} dateRange={dateRange} />;
      case 'airlines':
        return <AirlinesPage onNavigate={handleNavigate} dateRange={dateRange} />;
      case 'airline-details':
        return <AirlineDetailsPage airlineId={pageParams.airline || 'al1'} onBack={handleBack} dateRange={dateRange} />;
      case 'lead-time':
        return <LeadTimePage dateRange={dateRange} />;
      case 'inflation':
        return <InflationPage dateRange={dateRange} />;
      case 'historical':
        return <HistoricalPage dateRange={dateRange} />;
      case 'festivals':
        return <FestivalsPage dateRange={dateRange} />;
      case 'fare-composition':
        return <FareCompositionPage dateRange={dateRange} />;
      case 'availability':
        return <AvailabilityPage dateRange={dateRange} />;
      case 'backtesting':
        return <BacktestingPage dateRange={dateRange} />;
      case 'data-explorer':
        return <DataExplorerPage dateRange={dateRange} />;
      case 'api-docs':
        return <ApiDocsPage />;
      case 'about':
        return <AboutPage />;
      case 'admin-dashboard':
        return <AdminDashboard />;
      case 'admin-collection':
        return <AdminCollectionPage />;
      case 'admin-quality':
        return <AdminQualityPage />;
      case 'admin-raw':
        return <AdminRawPage />;
      case 'admin-config':
        return <AdminConfigPage />;
      case 'admin-weights':
        return <AdminWeightsPage />;
      default:
        return <OverviewDashboard onNavigate={handleNavigate} />;
    }
  };

  // Close mobile sidebar on page change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [currentPage]);

  return (
    <div className="flex h-screen overflow-hidden bg-navy-950">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar currentPage={currentPage} onNavigate={handleNavigate} collapsed={sidebarCollapsed} />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileSidebarOpen(false)} />
          <div className="fixed left-0 top-0 bottom-0 z-50 lg:hidden">
            <Sidebar currentPage={currentPage} onNavigate={handleNavigate} collapsed={false} onClose={() => setMobileSidebarOpen(false)} />
          </div>
        </>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          onMenuClick={() => setMobileSidebarOpen(true)}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          title={title}
          subtitle={subtitle}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

export default App;
