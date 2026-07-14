import { Input } from '../../../../components/ui/Input'
import { useResumeMaker } from '../../store/useResumeMaker'

export function ContactSummaryForm() {
  const { content, updateContent } = useResumeMaker()
  const c = content.contact

  const setField = (key: keyof typeof c) => (e: React.ChangeEvent<HTMLInputElement>) =>
    updateContent((prev) => ({ ...prev, contact: { ...prev.contact, [key]: e.target.value } }))

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Input placeholder="Full name" value={c.full_name} onChange={setField('full_name')} />
        <Input placeholder="Headline (e.g. Senior Backend Engineer)" value={c.headline} onChange={setField('headline')} />
        <Input placeholder="Email" type="email" value={c.email} onChange={setField('email')} />
        <Input placeholder="Phone" value={c.phone} onChange={setField('phone')} />
        <Input placeholder="Location" value={c.location} onChange={setField('location')} />
        <Input placeholder="LinkedIn URL" value={c.linkedin} onChange={setField('linkedin')} />
        <Input placeholder="GitHub URL" value={c.github} onChange={setField('github')} />
        <Input placeholder="Portfolio / website" value={c.portfolio} onChange={setField('portfolio')} />
      </div>
      <textarea
        value={content.summary}
        onChange={(e) => updateContent((prev) => ({ ...prev, summary: e.target.value }))}
        placeholder="2-3 sentence professional summary…"
        rows={3}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
      />
    </div>
  )
}
