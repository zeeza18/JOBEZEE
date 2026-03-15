import { useState } from 'react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { SectionHeader } from '../components/common/SectionHeader'
import { useAppStore } from '../store/useAppStore'

const SettingsPage = () => {
  const { resetAll, pushToast } = useAppStore()
  const [notifications, setNotifications] = useState(true)
  const [accent, setAccent] = useState('Bright')

  return (
    <div className="space-y-6">
      <SectionHeader title="Settings" eyebrow="Control" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="space-y-3 md:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-800">Notifications</p>
              <p className="text-sm text-slate-500">UI only toggle</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setNotifications((v) => !v)}>
              {notifications ? 'On' : 'Off'}
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-800">Accent intensity</p>
              <p className="text-sm text-slate-500">Light mode with cyan accents</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setAccent(accent === 'Bright' ? 'Soft' : 'Bright')}>
              {accent}
            </Button>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-medium text-slate-800">About</p>
            <p>Version 0.1 — Frontend only. Backend hooks can replace mock data + persistence.</p>
          </div>
        </Card>

        <Card className="space-y-3">
          <p className="text-sm font-medium text-slate-800">Danger zone</p>
          <Button
            variant="secondary"
            onClick={() => {
              resetAll()
              pushToast({ title: 'Local data reset', type: 'info' })
            }}
          >
            Reset local data
          </Button>
        </Card>
      </div>
    </div>
  )
}

export default SettingsPage
