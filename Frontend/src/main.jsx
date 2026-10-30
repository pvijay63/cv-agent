import React, { useEffect, useState } from 'react';

import { createRoot } from 'react-dom/client';

import { UploadCloud, FileCheck2, BriefcaseBusiness, Sparkles, ExternalLink, CheckCircle2, AlertCircle, Download, WandSparkles, Target } from 'lucide-react';

import './style.css';

import './studio.css';

import './template.css';

import './details.css';

const API = (
  import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8002'
).replace(/\/+$/, '');

const apiUrl = (path) => `${API}${path}`;

async function readApiJson(response, fallbackMessage = 'The request failed.') {

  const raw = await response.text();

  let data = null;

  if (raw.trim()) {

    try {

      data = JSON.parse(raw);

    } catch {

      const preview = raw.replace(/\s+/g, ' ').slice(0, 180);

      if (response.status >= 500 && /proxy error|econnrefused|internal server error/i.test(raw)) {

        throw new Error(`The frontend proxy cannot reach the backend at ${API}. Start the app with “npm run dev” and check the backend startup logs.`);

      }

      throw new Error(

        `The backend returned a non-JSON response (HTTP ${response.status}). ` +

        `${preview || 'Response body was empty.'}`

      );

    }

  }

  if (!response.ok) {

    throw new Error(data?.detail || data?.message || `${fallbackMessage} (HTTP ${response.status})`);

  }

  if (data === null) {

    throw new Error(`The backend returned an empty response (HTTP ${response.status}).`);

  }

  return data;

}

function friendlyApiError(error) {

  const message = error?.message || 'An unexpected error occurred.';

  if (/failed to fetch|networkerror|econnrefused|fetch failed/i.test(message)) {

    return `Cannot reach the backend at ${API}. Run “npm run dev” from the frontend folder to start both the frontend and backend, and check the terminal for Python errors.`;

  }

  return message;

}

function App() {

  const [file, setFile] = useState(null);

  const [role, setRole] = useState('Software Engineer');

  const [location, setLocation] = useState('Hyderabad, India');

  const [keywords, setKeywords] = useState('Python, SQL, REST APIs, Git');

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState('');

  const [result, setResult] = useState(null);

  const [keywordOptions, setKeywordOptions] = useState([]);

  const [selectedKeywords, setSelectedKeywords] = useState([]);

  const [sectionInputs, setSectionInputs] = useState({});
  const [sectionWriting, setSectionWriting] = useState({});
  const [sectionWriteErrors, setSectionWriteErrors] = useState({});

  const [draftAts, setDraftAts] = useState(null);

  const [hasScoredUpdates, setHasScoredUpdates] = useState(false);

  const [draftLoading, setDraftLoading] = useState(false);

  const [draftError, setDraftError] = useState('');

  const [downloadLoading, setDownloadLoading] = useState(false);

  const [apiStatus, setApiStatus] = useState('checking');

  const [enhanceLoading, setEnhanceLoading] = useState(false);

  const [enhanceError, setEnhanceError] = useState('');

  const [enhancedDraft, setEnhancedDraft] = useState('');

  const [enhancementSummary, setEnhancementSummary] = useState([]);

  const [enhancedAts, setEnhancedAts] = useState(null);

  const [originalEnhanceAts, setOriginalEnhanceAts] = useState(null);

  const [enhanceModel, setEnhanceModel] = useState('');

  useEffect(() => {

    let active = true;

    const checkApi = async () => {

      try {

        const response = await fetch('/api/health', { headers: { Accept: 'application/json' } });

        const data = await readApiJson(response, 'Backend health check failed.');

        if (active) setApiStatus(data.status === 'ok' ? 'online' : 'offline');

      } catch {

        if (active) setApiStatus('offline');

      }

    };

    checkApi();

    const timer = window.setInterval(checkApi, 12000);

    return () => {

      active = false;

      window.clearInterval(timer);

    };

  }, []);

  async function submit(e) {

    e.preventDefault();

    if (!file) { setError('Choose a resume file first.'); return; }

    setLoading(true); setError(''); setResult(null);

    const body = new FormData();

    body.append('file', file); body.append('target_role', role);

    body.append('location', location); body.append('keywords', keywords);

    try {

      // Send through Vite's same-origin proxy to avoid browser CORS failures.

      const res = await fetch(apiUrl('/api/analyze', { method: 'POST', body }));

      const data = await readApiJson(res, 'CV analysis failed.');

      setResult(data);

      setKeywordOptions([]);

      setSelectedKeywords([]);

      setSectionInputs({});
      setSectionWriteErrors({});
      setSectionWriting({});

      setDraftAts(data.ats);

      setHasScoredUpdates(false);

      setDraftError('');

    } catch (err) { setError(friendlyApiError(err)); }

    finally { setLoading(false); }

  }

  async function suggestKeywords() {

    setDraftLoading(true); setDraftError('');

    try {

      const body = new FormData();

      body.append('resume_text', result.resume_text);

      body.append('target_role', role);

      body.append('keywords', keywords);

      const res = await fetch('/api/improve', { method: 'POST', body });

      const data = await readApiJson(res, 'Could not prepare keyword suggestions.');

      setKeywordOptions(data.keyword_suggestions || []);

      setDraftAts(data.ats);

      setHasScoredUpdates(false);

    } catch (err) { setDraftError(friendlyApiError(err)); }

    finally { setDraftLoading(false); }

  }

  async function writeSectionWithAI(sectionName) {
    const notes = (sectionInputs[sectionName] || '').trim();

    if (notes.length < 8) {
      setSectionWriteErrors(current => ({
        ...current,
        [sectionName]: 'Enter your real experience details or actual dates before using AI.',
      }));
      return;
    }

    setSectionWriting(current => ({ ...current, [sectionName]: true }));
    setSectionWriteErrors(current => ({ ...current, [sectionName]: '' }));

    try {
      const body = new FormData();
      body.append('section_name', sectionName);
      body.append('notes', notes);
      body.append('resume_text', result?.resume_text || '');
      body.append('target_role', role);
      body.append('keywords', keywords);

      const response = await fetch('/api/write-section', {
        method: 'POST',
        body,
      });
      const data = await readApiJson(response, 'Could not write this resume section.');

      if (!data.content || !String(data.content).trim()) {
        throw new Error('The AI returned no section content.');
      }

      setSectionInputs(current => ({
        ...current,
        [sectionName]: String(data.content).trim(),
      }));
      setHasScoredUpdates(false);
    } catch (err) {
      setSectionWriteErrors(current => ({
        ...current,
        [sectionName]: friendlyApiError(err),
      }));
    } finally {
      setSectionWriting(current => ({ ...current, [sectionName]: false }));
    }
  }

  async function generateEnhancedPreview() {

    if (!result?.resume_text) return;

    setEnhanceLoading(true); setEnhanceError('');

    try {

      const body = new FormData();

      body.append('resume_text', result.resume_text);

      body.append('target_role', role);

      body.append('keywords', keywords);

      const res = await fetch('/api/enhance', { method: 'POST', body });

      const data = await readApiJson(res, 'Could not generate the enhanced resume.');

      setEnhancedDraft(data.enhanced_resume_text || '');

      setEnhancementSummary(data.change_summary || []);

      setEnhancedAts(data.ats || null);

      setOriginalEnhanceAts(data.original_ats || result.ats);

      setEnhanceModel(data.model || '');

    } catch (err) { setEnhanceError(friendlyApiError(err)); }

    finally { setEnhanceLoading(false); }

  }

  async function rescoreEnhancedPreview() {

    if (!enhancedDraft.trim()) return;

    setEnhanceLoading(true); setEnhanceError('');

    try {

      const body = new FormData();

      body.append('resume_text', enhancedDraft);

      body.append('target_role', role);

      body.append('keywords', keywords);

      const res = await fetch('/api/score-text', { method: 'POST', body });

      const data = await readApiJson(res, 'Could not score the edited preview.');

      setEnhancedAts(data.ats);

    } catch (err) { setEnhanceError(friendlyApiError(err)); }

    finally { setEnhanceLoading(false); }

  }

  function downloadEnhancedText() {

    if (!enhancedDraft.trim()) return;

    const blob = new Blob([enhancedDraft], { type: 'text/plain;charset=utf-8' });

    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');

    link.href = url;

    link.download = `${(file?.name || 'resume').replace(/\.[^.]+$/, '')}-ai-enhanced.txt`;

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);

  }

  async function scoreDraft() {

    setDraftLoading(true); setDraftError('');

    try {

      const body = new FormData();

      const adjustedText = `${result.resume_text}\nSkills: ${selectedKeywords.join(', ')}`;

      body.append('resume_text', adjustedText);

      body.append('target_role', role);

      body.append('keywords', keywords);

      body.append('additional_sections', JSON.stringify(additionalSectionsPayload()));

      const res = await fetch('/api/score-text', { method: 'POST', body });

      const data = await readApiJson(res, 'Could not score this draft.');

      setDraftAts(data.ats);

      setHasScoredUpdates(true);

    } catch (err) { setDraftError(friendlyApiError(err)); }

    finally { setDraftLoading(false); }

  }

  async function downloadDraft() {

    setDownloadLoading(true); setDraftError('');

    try {

      if (!file || !['.docx', '.pdf'].some(ext => file.name.toLowerCase().endsWith(ext))) {

        throw new Error('Download is available for the original DOCX and PDF formats.');

      }

      const body = new FormData();

      body.append('file', file);

      body.append('keywords', selectedKeywords.join(', '));

      body.append('additional_sections', JSON.stringify(additionalSectionsPayload()));

      const isPdf = file.name.toLowerCase().endsWith('.pdf');

      body.append('filename', file.name.replace(/\.(docx|pdf)$/i, '-tailored'));

      const res = await fetch(isPdf ? '/api/resume.pdf' : '/api/resume.docx', { method: 'POST', body });

      if (!res.ok) {

        let data = null;

        const raw = await res.text();

        try { data = raw ? JSON.parse(raw) : null; } catch { /* Use the HTTP status message below. */ }

        throw new Error(data?.detail || `Could not create the resume document (HTTP ${res.status}).`);

      }

      const blob = await res.blob();

      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');

      link.href = url;

      link.download = file.name.replace(/\.(docx|pdf)$/i, `-tailored${isPdf ? '.pdf' : '.docx'}`);

      link.click();

      URL.revokeObjectURL(url);

    } catch (err) { setDraftError(friendlyApiError(err)); }

    finally { setDownloadLoading(false); }

  }

  function additionalSectionsPayload() {

    return Object.fromEntries(Object.entries(sectionInputs).filter(([, value]) => value.trim()));

  }

  const ats = result?.ats;

  const missingSections = ats ? Object.entries(ats.section_checks).filter(([, found]) => !found).map(([name]) => name) : [];

  return <div className="app-shell">

    <header className="topbar"><div className="brand-mark"><BriefcaseBusiness size={21}/></div><div><div className="brand">CareerLens</div><div className="brand-sub">CV intelligence · job discovery</div></div><span className={`local-pill api-pill ${apiStatus}`} role="status" aria-live="polite"><i aria-hidden="true" />{apiStatus === 'online' ? 'API CONNECTED' : apiStatus === 'checking' ? 'CONNECTING…' : 'API OFFLINE'}</span></header>

    <main>

      <section className="hero"><div className="hero-orb orb-one"/><div className="hero-orb orb-two"/><div className="eyebrow"><Sparkles size={14}/> YOUR PERSONAL JOB SEARCH AGENT</div><h1>Make your next move<br/><span>with more clarity.</span></h1><p>Polish your resume, understand its ATS checklist, and find relevant roles with a little more confidence.</p><div className="hero-badges"><span><Target size={14}/> Role-tailored review</span><span><FileCheck2 size={14}/> Your facts stay yours</span></div></section>

      <section className="panel">

        <div className="section-title"><div className="step">01</div><div><h2>Start with your CV</h2><p>Upload a PDF, Word, PowerPoint, or plain-text resume.</p></div></div>

        <form onSubmit={submit}>

          <label className="upload-box" htmlFor="resume"><UploadCloud size={28}/><strong>{file ? file.name : 'Drop your resume here or browse'}</strong><span>PDF, DOCX, PPTX or TXT · max 8 MB</span><input id="resume" type="file" accept=".pdf,.docx,.pptx,.txt" onChange={e=>{setFile(e.target.files?.[0]||null);setError('')}}/></label>

          <div className="form-grid"><label>Target role<input value={role} onChange={e=>setRole(e.target.value)} placeholder="e.g. Data Analyst"/></label><label>Preferred location<input value={location} onChange={e=>setLocation(e.target.value)} placeholder="e.g. Hyderabad, India"/></label></div>

          <label>Skills / keywords to target<input value={keywords} onChange={e=>setKeywords(e.target.value)} placeholder="Python, SQL, cloud, stakeholder management"/></label>

          <button className="primary" disabled={loading}>{loading ? 'Analyzing your CV…' : 'Analyze CV & find jobs'} <span>→</span></button>

          {error && <div className="error"><AlertCircle size={17}/>{error}</div>}

        </form>

        <div className="privacy-note"><FileCheck2 size={16}/> Files are processed in memory by this local demo and are not saved to a database.</div>

      </section>

      {result && <div className="results">

        <div className="section-title result-heading"><div className="step">02</div><div><h2>Your analysis</h2><p>Based on {result.filename} · {ats.word_count} words</p></div></div>

        <section className="score-panel">

          <div className="score-ring" style={{'--score':`${ats.score}%`}}><div><strong>{ats.score}</strong><small>/100</small></div></div>

          <div className="score-copy"><span className="eyebrow">ATS-STYLE CHECKLIST</span><h3>{ats.score_label}</h3><p>{ats.disclaimer}</p></div>

        </section>

        <div className="result-grid">

          <section className="panel compact"><h3>Resume structure</h3><div className="check-list">{Object.entries(ats.section_checks).map(([name,ok])=><div className="check-row" key={name}>{ok?<CheckCircle2 className="good" size={17}/>:<AlertCircle className="bad" size={17}/>}<span>{name}</span><small>{ok?'Found':'Review'}</small></div>)}</div></section>

          <section className="panel compact"><h3>Keyword alignment</h3><p className="muted">Matched keywords</p><div className="chips">{ats.matched_keywords.length ? ats.matched_keywords.map(k=><span className="chip matched" key={k}>{k}</span>) : <span className="muted">No target terms matched yet.</span>}</div><p className="muted gap-label">Potential gaps — add only when truthful</p><div className="chips">{ats.missing_keywords.length ? ats.missing_keywords.map(k=><span className="chip missing" key={k}>{k}</span>) : <span className="muted">No missing target terms detected.</span>}</div></section>

        </div>

        <section className="panel compact"><h3>Recommended improvements</h3><ol className="suggestions">{ats.suggestions.map((s,i)=><li key={i}>{s}</li>)}</ol></section>

        <section className="panel optimizer-panel">

          <div className="section-title"><div className="step optimizer-step"><WandSparkles size={18}/></div><div><h2>Complete missing details</h2><p>Add only accurate information, preview its checklist effect, and download a tailored copy.</p></div></div>

          <div className="target-banner"><div><span>YOUR CHECKLIST GOAL</span><strong>92+ <small>/ 100</small></strong></div><p>Scores are a rough guide. No tool can promise an ATS score or interview; keep every claim accurate.</p></div>

          <button className="primary studio-primary suggest-button" onClick={suggestKeywords} disabled={draftLoading}>{draftLoading ? 'Finding relevant terms…' : <><WandSparkles size={17}/> Suggest relevant keywords</>}</button>

          <button className="primary studio-primary enhance-primary" onClick={generateEnhancedPreview} disabled={enhanceLoading || !result?.resume_text}>{enhanceLoading ? 'Enhancing and scoring…' : <><Sparkles size={17}/> AI-enhance CV + check role ATS score</>}</button>

          <p className="studio-hint">Creates a complete text preview tailored to <strong>{role || 'your target role'}</strong> and scores that exact version in the same request. AI must be configured in the backend.</p>

          {enhanceError && <div className="error"><AlertCircle size={17}/>{enhanceError}</div>}

          {enhancedDraft && <section className="enhanced-preview" aria-live="polite">

            <div className="enhanced-preview-head"><div><span className="enhanced-kicker"><Sparkles size={14}/> AI-ENHANCED PREVIEW</span><h3>Review before you apply</h3><p>Check every detail for accuracy. Edit the preview below, then recalculate its score.</p></div>{enhanceModel && <span className="model-pill">{enhanceModel}</span>}</div>

            {enhancedAts && <div className="enhanced-score-grid">

              <div className="enhanced-score-card"><span>Original checklist</span><strong>{originalEnhanceAts?.score ?? result.ats.score}<small>/100</small></strong></div>

              <div className="enhanced-score-card featured"><span>Enhanced role match</span><strong>{enhancedAts.score}<small>/100</small></strong><em>{enhancedAts.score_label}</em></div>

              <div className="enhanced-score-card"><span>Matched keywords</span><strong>{enhancedAts.matched_keywords?.length || 0}<small> terms</small></strong></div>

            </div>}

            {enhancementSummary.length > 0 && <div className="enhancement-changes"><strong>What changed</strong><ul>{enhancementSummary.map((item,i)=><li key={i}>{item}</li>)}</ul></div>}

            <div className="enhanced-document-layout">

              <div><label className="draft-label" htmlFor="enhanced-resume-preview">Edit AI-enhanced content</label>

                <textarea id="enhanced-resume-preview" className="draft-editor enhanced-editor" value={enhancedDraft} onChange={e=>setEnhancedDraft(e.target.value)} spellCheck="false" /></div>

              <div className="enhanced-paper-preview"><div className="paper-preview-label">LIVE CV PREVIEW</div><pre>{enhancedDraft}</pre></div>

            </div>

            {enhancedAts && <div className="enhanced-keyword-review"><div><strong>Matched</strong><div className="chips">{enhancedAts.matched_keywords?.length ? enhancedAts.matched_keywords.map(k=><span className="chip matched" key={k}>{k}</span>) : <span className="muted">No target keywords matched.</span>}</div></div><div><strong>Still missing</strong><div className="chips">{enhancedAts.missing_keywords?.length ? enhancedAts.missing_keywords.slice(0,16).map(k=><span className="chip missing" key={k}>{k}</span>) : <span className="muted">No target terms detected as missing.</span>}</div></div></div>}

            <div className="enhanced-actions"><button className="secondary" onClick={rescoreEnhancedPreview} disabled={enhanceLoading}>Recheck edited preview</button><button className="download-button" onClick={downloadEnhancedText}><Download size={16}/> Download enhanced TXT</button></div>

            <p className="studio-note">AI suggestions can make mistakes. The score is a heuristic checklist, not a real employer ATS score or a guarantee of shortlisting. The downloadable TXT is a content preview, not a formatted PDF/DOCX.</p>

          </section>}

          {keywordOptions.length > 0 && <div className="keyword-picker"><p>Choose only skills or terms that accurately describe your experience. They’ll be added to the existing Skills section.</p><div className="keyword-options">{keywordOptions.map(term=><label className="keyword-option" key={term}><input type="checkbox" checked={selectedKeywords.includes(term)} onChange={e=>setSelectedKeywords(current=>e.target.checked ? [...current,term] : current.filter(value=>value!==term))}/><span>{term}</span></label>)}</div></div>}

          {keywordOptions.length === 0 && <p className="studio-hint">Suggestions are based on the role and skills you entered above. Nothing is added until you select it.</p>}

          {[...new Set([...missingSections.filter(section => section !== 'Readable length'), 'Experience section', 'Dates / chronology'])].map(section => {
            const isAISection = section === 'Experience section' || section === 'Dates / chronology';
            const isWriting = Boolean(sectionWriting[section]);
            const writeError = sectionWriteErrors[section];
            const description =
              section === 'Phone number' ? 'Enter your real phone number.' :
              section === 'Experience section' ? 'Add your real role, employer, responsibilities, tools, and achievements.' :
              section === 'Dates / chronology' ? 'Enter the actual employment and education dates or date ranges.' :
              section === 'Contact details' ? 'Add a professional email, city, or profile link.' :
              section === 'Education section' ? 'Add your real school, qualification, and dates.' :
              section === 'Projects or achievements' ? 'Add a real project, achievement, or measurable result.' :
              'Add the relevant details that are true for you.';
            const placeholder =
              section === 'Phone number' ? 'Your real phone number' :
              section === 'Experience section' ? 'Describe your real role, employer, responsibilities, tools, and outcomes…' :
              section === 'Dates / chronology' ? 'Example: Software Engineer, ABC Ltd, Jan 2022 – Mar 2025' :
              'Enter accurate details…';

            return (
              <div className="missing-detail" key={section}>
                <label htmlFor={`missing-${section.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
                  <strong>{section}</strong>
                </label>
                <span>{description}</span>
                <textarea
                  id={`missing-${section.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                  rows={section === 'Phone number' ? 2 : 4}
                  value={sectionInputs[section] || ''}
                  onChange={e => {
                    setSectionInputs(current => ({ ...current, [section]: e.target.value }));
                    setHasScoredUpdates(false);
                  }}
                  placeholder={placeholder}
                />

                {isAISection && (
                  <button
                    type="button"
                    className="secondary ai-section-button"
                    onClick={() => writeSectionWithAI(section)}
                    disabled={isWriting || !result?.resume_text}
                  >
                    <Sparkles size={16} />
                    {isWriting ? 'Writing with AI…' : 'Write / Improve with AI'}
                  </button>
                )}

                {writeError && (
                  <div className="error section-write-error" role="alert">
                    <AlertCircle size={16} />
                    <span>{writeError}</span>
                  </div>
                )}

                {isAISection && (
                  <div className="section-live-preview">
                    <div className="section-preview-heading">
                      <FileCheck2 size={14} />
                      LIVE SECTION PREVIEW
                    </div>
                    <pre>{(sectionInputs[section] || '').trim() || 'Your reviewed section will appear here as you type or after AI writing.'}</pre>
                  </div>
                )}
              </div>
            );
          })}

          {missingSections.includes('Readable length') && <p className="format-note">The checklist’s readable-length range is 300–1,800 words. Add useful, factual detail only; don’t pad the CV to chase a score.</p>}

          <div className="draft-actions"><button className="secondary" onClick={scoreDraft} disabled={draftLoading}>Preview updated checklist score</button><button className="download-button" onClick={downloadDraft} disabled={downloadLoading || !file || !['.docx','.pdf'].some(ext=>file.name.toLowerCase().endsWith(ext))}><Download size={16}/>{downloadLoading ? 'Preparing…' : 'Download with original template'}</button></div>

          {file?.name?.toLowerCase().endsWith('.pdf') && <p className="format-note">Your original PDF pages stay unchanged. Added details and selected skills will appear on a new page at the end.</p>}

          {file?.name?.toLowerCase().endsWith('.docx') && <p className="studio-hint">Original Word content is preserved; any new missing sections are appended in the same document.</p>}

          {file && !['.docx','.pdf'].some(ext=>file.name.toLowerCase().endsWith(ext)) && <p className="format-note">Template-preserving downloads are available for DOCX and PDF files.</p>}          {draftAts && <div className="draft-score"><div className="draft-score-number">{draftAts.score}<small>/100</small></div><div><strong>{draftAts.score >= 92 ? 'You reached your checklist goal' : hasScoredUpdates ? 'Updated score with your additions' : 'Current checklist score'}</strong><p>{draftAts.score >= 92 ? 'Nice progress. Review the resume carefully before applying.' : `Review the suggestions below and add relevant details only when they are true. ${92 - draftAts.score} points below your goal.`}</p></div></div>}

          {draftAts && <ul className="studio-suggestions">{draftAts.suggestions.slice(0,5).map((item,i)=><li key={i}>{item}</li>)}</ul>}

          {draftError && <div className="error"><AlertCircle size={17}/>{draftError}</div>}

          <p className="studio-note">Your original document layout and content are retained. Only selected terms are appended to existing Skills content; if the file has no Skills section, no file is changed.</p>

        </section>

        <section className="panel compact"><div className="section-title small-title"><div className="step">AI</div><div><h3>Resume coach</h3><p>Optional feedback from Groq</p></div></div>{result.ai_feedback.available?<><div className="model-pill">Model: {result.ai_feedback.model}</div><pre className="ai-feedback">{result.ai_feedback.feedback}</pre></>:<p className="muted">{result.ai_feedback.message}</p>}</section>

        <section className="panel compact"><div className="section-title small-title"><div className="step">03</div><div><h2>Explore matching jobs</h2><p>Search portals and company-hosted listings for {role || 'your target role'}.</p></div></div><div className="jobs">{result.jobs.map(j=><a className="job-link" href={j.url} target="_blank" rel="noreferrer" key={j.portal}><div className="job-icon"><BriefcaseBusiness size={18}/></div><div className="job-text"><strong>{j.portal}</strong><span>{j.note}</span></div><ExternalLink size={17}/></a>)}</div><p className="job-disclaimer">These are live search links, not verified individual vacancies. Confirm the job is open and apply on the employer's official site where possible.</p></section>

        <details className="panel compact"><summary>Extracted resume text preview</summary><pre className="preview">{result.preview}</pre></details>

      </div>}

      <footer>CareerLens · Local prototype <span>Not affiliated with job boards or ATS vendors</span></footer>

    </main>

  </div>

}

createRoot(document.getElementById('root')).render(<App/>);
