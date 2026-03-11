import { Router, Route, Switch } from 'wouter'
import { useHashLocation } from 'wouter/use-hash-location'
import { HomePage } from './pages/HomePage'
import { RoomPage } from './pages/RoomPage'
import { ThemeToggle } from './components/ThemeToggle'

export default function App() {
  return (
    <>
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <Router hook={useHashLocation}>
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/room/:id" component={RoomPage} />
        </Switch>
      </Router>
    </>
  )
}
