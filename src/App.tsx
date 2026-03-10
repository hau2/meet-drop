import { Router, Route, Switch } from 'wouter'
import { useHashLocation } from 'wouter/use-hash-location'
import { HomePage } from './pages/HomePage'
import { RoomPage } from './pages/RoomPage'

export default function App() {
  return (
    <Router hook={useHashLocation}>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/room/:id" component={RoomPage} />
      </Switch>
    </Router>
  )
}
