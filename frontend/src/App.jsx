import { useEffect, useState } from 'react'

function App() {
  const [status, setStatus] = useState('checking...')
  const [ok, setOk] = useState(null)

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        setStatus(`${data.service} (${data.environment}): ${data.status}`)
        setOk(true)
      })
      .catch(() => {
        setStatus('unreachable — is the backend running on port 8000?')
        setOk(false)
      })
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="space-y-3 text-center">
        <h1 className="text-3xl font-bold text-slate-800">TripUnify</h1>
        <p className="text-slate-500">
          Backend status:{' '}
          <span
            className={`font-mono ${ok === false ? 'text-red-600' : 'text-emerald-600'}`}
          >
            {status}
          </span>
        </p>
      </div>
    </div>
  )
}

export default App
