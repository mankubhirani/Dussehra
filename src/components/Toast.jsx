import { useEffect, useState } from 'react'

let push = () => {}
export const toast = (msg) => push(msg)

export default function Toast() {
  const [msg, setMsg] = useState('')
  useEffect(() => {
    let id
    push = (m) => {
      setMsg(m)
      clearTimeout(id)
      id = setTimeout(() => setMsg(''), 2600)
    }
    return () => {
      push = () => {}
      clearTimeout(id)
    }
  }, [])
  return (
    <div className="toast" role="status" aria-live="polite" data-show={!!msg}>
      {msg}
    </div>
  )
}
