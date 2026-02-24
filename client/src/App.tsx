import { Route, Switch } from 'wouter';
import Chat from './pages/Chat';
import Onboarding from './pages/Onboarding';
import Profile from './pages/Profile';

function NotFound() {
  return <div style={{padding:'2rem',textAlign:'center'}}><h1>404 - Pagina niet gevonden</h1></div>;
}

function Home() {
  return <div style={{padding:'2rem'}}><h1>Opvoedmaatje</h1><p>Welkom bij Opvoedmaatje!</p></div>;
}

function App() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/chat" component={Chat} />
      <Route path="/profile" component={Profile} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default App;
