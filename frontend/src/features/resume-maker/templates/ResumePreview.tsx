import type { ResumeDocumentContent, ResumeDocumentSettings } from '../../../lib/api'
import { ACCENT_COLORS, FONT_STACKS, basePt, gapPx, headingBorder, headingColor, pagePx } from './styles'

const SECTION_LABELS: Record<string, string> = {
  experience: 'Experience', education: 'Education', skills: 'Skills',
  projects: 'Projects', certifications: 'Certifications',
}

function SectionHeading({ label, settings }: { label: string; settings: ResumeDocumentSettings }) {
  const base = basePt(settings)
  const gap = gapPx(settings)
  return (
    <div
      style={{
        fontFamily: FONT_STACKS[settings.header_font],
        fontSize: `${base + 1}pt`,
        fontWeight: 700,
        color: headingColor(settings),
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        borderBottom: headingBorder(settings),
        paddingBottom: 2,
        marginTop: gap,
        marginBottom: settings.compact ? gap * 0.75 : gap,
      }}
    >
      {label}
    </div>
  )
}

export function ResumePreview({ content, settings }: { content: ResumeDocumentContent; settings: ResumeDocumentSettings }) {
  const base = basePt(settings)
  const gap = gapPx(settings)
  const compactMul = settings.compact ? 0.75 : 1
  const headerFont = FONT_STACKS[settings.header_font]
  const bodyFont = FONT_STACKS[settings.body_font]
  const accent = ACCENT_COLORS[settings.accent_color]
  const { width } = pagePx(settings)
  const c = content.contact

  const contactBits = [c.email, c.phone, c.location, c.linkedin, c.github, c.portfolio, c.website].filter(Boolean)

  return (
    <div
      className="bg-white shadow-md mx-auto"
      style={{
        width,
        minHeight: pagePx(settings).height,
        padding: `${settings.margin_top}mm ${settings.margin_right}mm ${settings.margin_bottom}mm ${settings.margin_left}mm`,
        color: '#111827',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: gap }}>
        <div style={{ fontFamily: headerFont, fontSize: `${base + 4}pt`, fontWeight: 700, color: settings.template === 'modern' ? accent : '#111827' }}>
          {c.full_name || 'Your Name'}
        </div>
        {c.headline && (
          <div style={{ fontFamily: bodyFont, fontSize: `${base - 1}pt`, color: '#4b5563' }}>{c.headline}</div>
        )}
        {settings.show_contact_icons && contactBits.length > 0 && (
          <div style={{ fontFamily: bodyFont, fontSize: `${base - 2}pt`, color: '#4b5563', marginTop: 2 }}>
            {contactBits.join('  |  ')}
          </div>
        )}
      </div>

      {content.summary && (
        <>
          <SectionHeading label="Summary" settings={settings} />
          <div style={{ fontFamily: bodyFont, fontSize: `${base}pt` }}>{content.summary}</div>
        </>
      )}

      {content.section_order.map((key) => {
        const label = SECTION_LABELS[key]
        if (!label) return null

        if (key === 'experience' && content.experience.length > 0) {
          return (
            <div key={key}>
              <SectionHeading label={label} settings={settings} />
              {content.experience.map((exp) => (
                <div key={exp.id} style={{ marginBottom: gap * compactMul, fontFamily: bodyFont }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: `${base}pt` }}>
                    <span>{exp.title} — {exp.company}</span>
                    <span>{exp.start_date} – {exp.current ? 'Present' : exp.end_date}</span>
                  </div>
                  {exp.location && <div style={{ fontSize: `${base - 1}pt`, color: '#6b7280' }}>{exp.location}</div>}
                  <ul style={{ margin: '2px 0 0 16px', padding: 0 }}>
                    {exp.bullets.map((b, i) => <li key={i} style={{ fontSize: `${base}pt` }}>{b}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          )
        }
        if (key === 'education' && content.education.length > 0) {
          return (
            <div key={key}>
              <SectionHeading label={label} settings={settings} />
              {content.education.map((edu) => (
                <div key={edu.id} style={{ marginBottom: gap * compactMul, fontFamily: bodyFont, fontSize: `${base}pt` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                    <span>{edu.degree} {edu.field} — {edu.school}</span>
                    <span>{edu.start_date} – {edu.end_date}</span>
                  </div>
                  <div style={{ fontSize: `${base - 1}pt`, color: '#6b7280' }}>
                    {edu.location}{edu.gpa ? `  |  GPA ${edu.gpa}` : ''}
                  </div>
                </div>
              ))}
            </div>
          )
        }
        if (key === 'skills' && content.skills.length > 0) {
          return (
            <div key={key}>
              <SectionHeading label={label} settings={settings} />
              {content.skills.map((sk) => (
                <div key={sk.id} style={{ fontFamily: bodyFont, fontSize: `${base}pt`, marginBottom: 2 }}>
                  <b>{sk.label}:</b> {sk.items.join(', ')}
                </div>
              ))}
            </div>
          )
        }
        if (key === 'projects' && content.projects.length > 0) {
          return (
            <div key={key}>
              <SectionHeading label={label} settings={settings} />
              {content.projects.map((proj) => (
                <div key={proj.id} style={{ marginBottom: gap * compactMul, fontFamily: bodyFont, fontSize: `${base}pt` }}>
                  <b>{proj.name}</b> {proj.description}
                  <ul style={{ margin: '2px 0 0 16px', padding: 0 }}>
                    {proj.bullets.map((b, i) => <li key={i} style={{ fontSize: `${base}pt` }}>{b}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          )
        }
        if (key === 'certifications' && content.certifications.length > 0) {
          return (
            <div key={key}>
              <SectionHeading label={label} settings={settings} />
              {content.certifications.map((cert) => (
                <div key={cert.id} style={{ fontFamily: bodyFont, fontSize: `${base}pt` }}>
                  {cert.name} — {cert.issuer} ({cert.date})
                </div>
              ))}
            </div>
          )
        }
        return null
      })}

      {content.custom.map((section) => (
        <div key={section.id}>
          <SectionHeading label={section.title} settings={settings} />
          <ul style={{ margin: '2px 0 0 16px', padding: 0, fontFamily: bodyFont }}>
            {section.items.map((item, i) => <li key={i} style={{ fontSize: `${base}pt` }}>{item}</li>)}
          </ul>
        </div>
      ))}
    </div>
  )
}
