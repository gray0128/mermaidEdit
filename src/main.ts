import './styles/main.css'
import { App } from './App.ts'

const app = document.getElementById('app')
if (app) {
  new App(app)
}