import { useState } from 'react'
import TxForm from '../components/TxForm'

export default function QuickAdd() {
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [formKey, setFormKey] = useState(0)

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Add transaction</h1>
      {savedAt && (
        <div className="mb-4 rounded-xl border border-emerald-700 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-300">
          Saved ✓
        </div>
      )}
      <TxForm
        key={formKey}
        onSaved={() => {
          setSavedAt(Date.now())
          setFormKey((k) => k + 1)
          setTimeout(() => setSavedAt(null), 2500)
        }}
      />
    </div>
  )
}
