import { Component, type ReactNode } from 'react'

/** Si algo explota en una vista, no se pierde la app entera: se muestra el error y un botón para recargar. */
export class LimiteError extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="tarjeta mt-4 space-y-3">
        <div className="font-semibold">Algo falló</div>
        <div className="break-words text-xs text-texto-2">{this.state.error.message}</div>
        <div className="text-xs text-texto-3">Tus datos están guardados. Recargá para seguir.</div>
        <button type="button" className="btn-grande" onClick={() => location.reload()}>Recargar</button>
      </div>
    )
  }
}
