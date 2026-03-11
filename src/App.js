import { BrowserRouter } from 'react-router-dom';
import './App.css';
import Home from './components/Home';
import Login from './components/Login';
import PrivateRoute from './components/PrivateRoute';
import PublicRoute from './components/PublicRoute';
import SignUp from './components/signUp';
import TitanGame from './game/TitanGame';
import { AuthProvider } from "./context/AuthContext";

function App() {
  // Check if game route
  const isGameRoute = window.location.pathname === '/game' || window.location.hash === '#/game';

  if (isGameRoute) {
    return <TitanGame />;
  }

  return (
    <AuthProvider>
      <div style={{ margin: '2rem' }}>
        <BrowserRouter>
          <PrivateRoute exact path="/" component={Home} />
          <PublicRoute path="/signup" component={SignUp} />
          <PublicRoute path="/login" component={Login} />
        </BrowserRouter>
      </div>
    </AuthProvider>
  );
}

export default App;
