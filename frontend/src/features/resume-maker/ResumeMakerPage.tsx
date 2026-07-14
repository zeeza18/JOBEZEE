import { useEffect } from 'react'
import { Download, FileText, Loader2 } from 'lucide-react'
import { Input } from '../../components/ui/Input'
import { resumeBuilderApi } from '../../lib/api'
import { useResumeMaker } from './store/useResumeMaker'
import { CollapsibleCard } from './components/CollapsibleCard'
import { ImportBar } from './components/ImportBar'
import { MyResumesBar } from './components/MyResumesBar'
import { ScorePanel } from './components/ScorePanel'
import { TemplateSelector } from './components/TemplateSelector'
import { FormattingControls } from './components/FormattingControls'
import { SectionOrderPanel } from './components/SectionOrderPanel'
import { ContactSummaryForm } from './components/SectionForm/ContactSummaryForm'
import { ExperienceForm } from './components/SectionForm/ExperienceForm'
import { EducationForm } from './components/SectionForm/EducationForm'
import { SkillsForm } from './components/SectionForm/SkillsForm'
import { ProjectsForm } from './components/SectionForm/ProjectsForm'
import { CertificationsForm } from './components/SectionForm/CertificationsForm'
import { CustomSectionsForm } from './components/SectionForm/CustomSectionsForm'
import { LivePreviewFrame } from './components/LivePreviewFrame'

const ResumeMakerPage = () => {
  const { loaded, loadingDoc, saving, activeId, title, content, settings, loadAll, setTitle } = useResumeMaker()

  useEffect(() => {
    if (!loaded) loadAll()
  }, [loaded, loadAll])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Resume Maker</h1>
          <p className="text-xs text-slate-400 mt-0.5">Build a structured resume from scratch — pick a template, fill it in, export.</p>
        </div>
        <span className="text-xs text-slate-400">
          {saving ? (
            <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Saving…</span>
          ) : 'Saved'}
        </span>
      </div>

      {loaded && <MyResumesBar />}
      <ImportBar />

      {!loaded ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* ── Left: editor ── */}
          <div className="space-y-3">
            <CollapsibleCard title="Resume title">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Software Engineer Resume" />
            </CollapsibleCard>

            <CollapsibleCard title="Contact & Summary">
              <ContactSummaryForm />
            </CollapsibleCard>

            <CollapsibleCard title="Experience">
              <ExperienceForm />
            </CollapsibleCard>

            <CollapsibleCard title="Education">
              <EducationForm />
            </CollapsibleCard>

            <CollapsibleCard title="Skills">
              <SkillsForm />
            </CollapsibleCard>

            <CollapsibleCard title="Projects" defaultOpen={false}>
              <ProjectsForm />
            </CollapsibleCard>

            <CollapsibleCard title="Certifications" defaultOpen={false}>
              <CertificationsForm />
            </CollapsibleCard>

            <CollapsibleCard title="Custom sections" defaultOpen={false}>
              <CustomSectionsForm />
            </CollapsibleCard>

            <CollapsibleCard title="Section order" defaultOpen={false}>
              <SectionOrderPanel />
            </CollapsibleCard>

            <CollapsibleCard title="Template">
              <TemplateSelector />
            </CollapsibleCard>

            <CollapsibleCard title="Formatting" defaultOpen={false}>
              <FormattingControls />
            </CollapsibleCard>

            <CollapsibleCard title="ATS score" defaultOpen={false}>
              <ScorePanel />
            </CollapsibleCard>
          </div>

          {/* ── Right: live preview ── */}
          <div className="lg:sticky lg:top-4 lg:self-start space-y-3">
            <div className="flex items-center justify-end gap-2">
              <a
                href={activeId ? resumeBuilderApi.exportPdfUrl(activeId) : undefined} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Download className="h-3.5 w-3.5" /> PDF
              </a>
              <a
                href={activeId ? resumeBuilderApi.exportDocxUrl(activeId) : undefined} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <FileText className="h-3.5 w-3.5" /> DOCX
              </a>
            </div>
            <div className="max-h-[calc(100vh-160px)] overflow-y-auto rounded-2xl bg-slate-200">
              {loadingDoc ? (
                <div className="flex h-64 items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                </div>
              ) : (
                <LivePreviewFrame content={content} settings={settings} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ResumeMakerPage
