import { Routes, Route } from 'react-router-dom';
import Welcome from './screens/Welcome';
import Login from './screens/Login';
import Signup from './screens/Signup';
import Linking from './screens/Linking';
import SalarySelect from './screens/SalarySelect';
import PortiSurvey from './screens/PortiSurvey';
import AssetPrescription from './screens/AssetPrescription';
import PrescriptionIntro from './screens/PrescriptionIntro';
import PrescriptionLoading from './screens/PrescriptionLoading';
import PrescriptionComplete from './screens/PrescriptionComplete';
import AssetPortfolio from './screens/AssetPortfolio';
import Dashboard from './screens/Dashboard';
import MonthlyReport from './screens/MonthlyReport';
import SalaryManagement from './screens/SalaryManagement';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Welcome />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/linking" element={<Linking />} />
      <Route path="/salary-select" element={<SalarySelect />} />
      <Route path="/porti-survey" element={<PortiSurvey />} />
      <Route path="/prescription-intro" element={<PrescriptionIntro />} />
      <Route path="/prescription-loading" element={<PrescriptionLoading />} />
      <Route path="/asset-prescription" element={<AssetPrescription />} />
      <Route path="/prescription-complete" element={<PrescriptionComplete />} />
      <Route path="/asset-portfolio" element={<AssetPortfolio />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/salary-management" element={<SalaryManagement />} />
      <Route path="/monthly-report" element={<MonthlyReport />} />
    </Routes>
  );
}
