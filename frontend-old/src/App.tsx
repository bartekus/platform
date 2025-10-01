import { LogtoProvider, useLogto } from '@logto/react';
import { BrowserRouter as Router, Routes, Route } from 'react-router';

import { config } from './config/logto';
// import { Layout } from './components/Layout'
// import { Home } from './pages/Home'
// import { ProtectedResource } from './pages/ProtectedResource'
// import { Callback } from './pages/Callback'

import { RequireAuth } from '~/libs/require-auth';
import { SubscriptionVerification } from '~/libs/subscription-verification';
import { SubscriptionGuard } from '~/libs/subscription-guard';

import { PageLayout } from '~/layouts/page-layout';
import { AdminLayout } from '~/layouts/admin-layout';

import { Landing } from '~/pages/Landing';
import { Callback } from '~/pages/Callback';
import { Subscribe } from '~/pages/Subscribe';
import { Dashboard } from '~/pages/Dashboard';

import { AdminDashboard } from '~/pages/AdminDashboard';
import { OrganizationPage } from '~/pages/OrganizationPage';
import { WorkspacePage } from '~/pages/WorkspacePage';

// function App() {
//   return (
//     <LogtoProvider config={config}>
//       <Router>
//         <Layout>
//           <Routes>
//             <Route path="/" element={<Home />} />
//             <Route path="/protected" element={<ProtectedResource />} />
//             <Route path="/callback" element={<Callback />} />
//           </Routes>
//         </Layout>
//       </Router>
//     </LogtoProvider>
//   )
// }

function App() {
  return (
    <LogtoProvider config={config}>
      <Router>
        <Routes>
          <Route path="/callback" element={<Callback />} />

          <Route path="/subscription" element={<RequireAuth />}>
            <Route path="/subscription/verify" element={<SubscriptionVerification />} />
            <Route path="/subscription/subscribe" element={<Subscribe />} />
          </Route>

          <Route path="/*" element={<AppContent />} />
        </Routes>
      </Router>
    </LogtoProvider>
  );
}

function AppContent() {
  const { isAuthenticated /*, getOrganizationToken, getOrganizationTokenClaims, getIdTokenClaims*/ } = useLogto();
  // const [organizationIds, setOrganizationIds] = useState<string[]>();
  //
  // useEffect(() => {
  //   (async () => {
  //     const claims = await getIdTokenClaims();
  //
  //     console.log('ID token claims', claims);
  //     setOrganizationIds(claims?.organizations);
  //   })();
  // }, [getIdTokenClaims]);

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route element={<PageLayout />}>
          <Route path="/" element={<Landing />} />
        </Route>
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<SubscriptionGuard />}>
        <Route element={<PageLayout />}>
          <Route path="/" element={<Dashboard />} />
        </Route>

        <Route element={<AdminLayout />}>
          <Route path="/:orgId" element={<OrganizationPage />} />
          <Route path="/:orgId/space/:workspaceId" element={<WorkspacePage />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
