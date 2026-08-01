import { render } from 'preact'

import './style.css'
import { useEffect, useState } from 'preact/hooks'

import type { PanelState, ToHost, ToWebview } from './protocol'

// Injected by VS Code into every webview. Also the only channel to the host.
declare function acquireVsCodeApi(): {
  postMessage(message: ToHost): void
  getState(): { state?: PanelState } | undefined
  setState(value: { state?: PanelState }): void
}

const vscode = acquireVsCodeApi()

function post(message: ToHost) {
  vscode.postMessage(message)
}

function App() {
  // Seeded from the webview's own persisted state so a reload paints immediately rather
  // than flashing empty while the host replies.
  const [state, setState] = useState<PanelState | null>(vscode.getState()?.state ?? null)

  useEffect(() => {
    const onMessage = (event: MessageEvent<ToWebview>) => {
      const message = event.data
      if (message.type === 'state' || message.type === 'themeChanged') {
        setState(message.state)
        vscode.setState({ state: message.state })
      }
    }
    window.addEventListener('message', onMessage)
    post({ type: 'ready' })
    return () => window.removeEventListener('message', onMessage)
  }, [])

  if (!state) return <p class="muted">Loading…</p>

  return (
    <main>
      <header>
        <h1>Chromaleon</h1>
        <span class="muted">v{state.version}</span>
      </header>

      {state.theme ? (
        <p>
          Editing <strong>{state.theme}</strong>
          <span class="muted"> · {state.light ? 'light' : 'dark'}</span>
        </p>
      ) : (
        <p class="warn">No Chromaleon theme is active. Pick one to start customising.</p>
      )}

      <section class="row">
        <span class="swatch" style={{ background: state.accent }} />
        <code>{state.accent}</code>
        <span class="muted">accent</span>
      </section>

      {/* Proves the panel is painted from VS Code's own resolved colours: these repaint
          the moment the theme or a customization changes, with no work from us. */}
      <section class="probe">
        {(
          [
            ['editor', '--vscode-editor-background', '--vscode-editor-foreground'],
            ['sidebar', '--vscode-sideBar-background', '--vscode-sideBar-foreground'],
            ['button', '--vscode-button-background', '--vscode-button-foreground'],
            ['badge', '--vscode-badge-background', '--vscode-badge-foreground'],
          ] as const
        ).map(([label, bg, fg]) => (
          <div key={label} style={{ background: `var(${bg})`, color: `var(${fg})` }}>
            {label}
          </div>
        ))}
      </section>

      <button onClick={() => post({ type: 'openSettings' })}>Open settings</button>
    </main>
  )
}

render(<App />, document.body)
