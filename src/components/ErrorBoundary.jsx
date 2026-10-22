import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) {
    return { error }
  }
  componentDidCatch(error) {
    console.error('Scene error:', error)
  }
  render() {
    if (this.state.error) return this.props.fallback
    return this.props.children
  }
}
