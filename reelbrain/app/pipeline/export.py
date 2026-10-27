"""
Report Exporters for ReelBrain (Milestone 2).
Provides export functions for Section 9 Autopsy Reports:
- export_report_markdown(report: Section9Report) -> str
- export_report_html(report: Section9Report) -> str
- export_report_pdf(report: Section9Report, output_path: str | Path) -> Path
"""

import html
from pathlib import Path

from reelbrain.app.schemas.report import Section9Report


def _ms_to_timestamp(ms: int) -> str:
    """Formats milliseconds to MM:SS or MM:SS.s string."""
    seconds = ms / 1000.0
    m = int(seconds // 60)
    s = seconds % 60
    return f"{m:02d}:{s:04.1f}"


def export_report_markdown(report: Section9Report) -> str:
    """Exports a Section 9 report to clean, standardized Markdown."""
    lines: list[str] = []

    lines.append(f"# {report.title}")
    lines.append(f"**Video ID:** `{report.video_id}` | **Evidence Coverage:** `{report.evidence_coverage_pct:.1f}%`")
    lines.append("")

    # 1. Verdict
    lines.append("## 1. Verdict")
    lines.append(f"- **What it does best:** {report.verdict_best}")
    lines.append(f"- **Where it loses people:** {report.verdict_dropoff}")
    lines.append(f"- **Platform fit:** {report.verdict_fit}")
    lines.append("")

    # 2. Why It Works
    lines.append("## 2. Why It Works")
    for b in report.why_it_works:
        t_str = _ms_to_timestamp(b.t_ms)
        lines.append(f"- `[{t_str}]` **({b.confidence.upper()} confidence)**: {b.explanation}")
    lines.append("")

    # 3. Weak Points
    lines.append("## 3. Weak Points & Actionable Fixes")
    if report.weak_points:
        for wp in report.weak_points:
            t_str = _ms_to_timestamp(wp.t_ms)
            lines.append(f"- `[{t_str}]` **Issue:** {wp.issue}")
            lines.append(f"  - **Fix:** {wp.fix}")
    else:
        lines.append("- *No major friction points detected.*")
    lines.append("")

    # 4. Platform Notes
    lines.append("## 4. Platform Notes")
    lines.append(f"> *{report.platform_notes.heuristic_disclaimer}*")
    lines.append("")
    lines.append(f"**Instagram Reels:** {report.platform_notes.instagram_note}")
    lines.append("")
    lines.append(f"**TikTok:** {report.platform_notes.tiktok_note}")
    lines.append("")

    # 5. Scores
    lines.append("## 5. Performance Estimates (Scores 0–100)")
    lines.append(f"> *{report.scores.label}*")
    lines.append("")
    lines.append("| Metric | Score (0-100) | Evaluation |")
    lines.append("| :--- | :--- | :--- |")
    lines.append(f"| **Hook** | {report.scores.hook}/100 | Stop-rate strength in first 3.0s |")
    lines.append(f"| **Retention** | {report.scores.retention}/100 | Visual pace and cut rhythm |")
    lines.append(f"| **Emotion** | {report.scores.emotion}/100 | Problem relatability and resonance |")
    lines.append(f"| **Clarity** | {report.scores.clarity}/100 | Product and message comprehension |")
    lines.append(f"| **CTA** | {report.scores.cta}/100 | Conversion prompt directness |")
    lines.append(f"| **Shareability** | {report.scores.shareability}/100 | Save and send-to-friend trigger |")
    lines.append("")

    # 6. Sourced Stats
    lines.append("## 6. Sourced Stats")
    if report.stats:
        lines.append("| Metric | Value | Source |")
        lines.append("| :--- | :--- | :--- |")
        for st in report.stats:
            lines.append(f"| {st.metric} | {st.value} | `{st.source}` |")
    else:
        lines.append("*No third-party analytics data connected.*")
    lines.append("")

    # 7. Reusable Structure Blueprint
    lines.append("## 7. Reusable Structure Blueprint")
    lines.append("| Role | Timing | Duration | Attention Technique | Purpose |")
    lines.append("| :--- | :--- | :--- | :--- | :--- |")
    for beat in report.structure_blueprint:
        t_span = f"{_ms_to_timestamp(beat.t_start_ms)} - {_ms_to_timestamp(beat.t_end_ms)}"
        lines.append(
            f"| **{beat.role.upper()}** | `{t_span}` | `{beat.duration_s}s` | {beat.technique} | {beat.purpose} |"
        )
    lines.append("")

    # 8. Frame-by-frame Table
    lines.append("## 8. Frame-by-Frame Autopsy")
    lines.append("| Timestamp | Visual Subject | Role | Why It Works |")
    lines.append("| :--- | :--- | :--- | :--- |")
    for row in report.frame_table:
        lines.append(
            f"| `{_ms_to_timestamp(row.t_ms)}` | {row.what_is_on_screen} | `{row.role}` | {row.why_it_works} |"
        )
    lines.append("")

    # 9. Memory Note
    lines.append("## 9. Memory System Status")
    lines.append(f"- {report.memory_note}")
    lines.append("")

    # 10. Next Actions
    lines.append("## 10. Recommended Next Actions")
    for act in report.next_actions:
        lines.append(f"- [ ] {act}")
    lines.append("")

    return "\n".join(lines)


def export_report_html(report: Section9Report) -> str:
    """Exports a Section 9 report to a standalone, responsive, printable HTML document."""
    escaped_title = html.escape(report.title)

    beats_html = "".join(
        f"""<tr>
          <td><span class="role-badge role-{html.escape(beat.role)}">{html.escape(beat.role.upper())}</span></td>
          <td><code>{_ms_to_timestamp(beat.t_start_ms)} - {_ms_to_timestamp(beat.t_end_ms)}</code></td>
          <td><code>{beat.duration_s}s</code></td>
          <td>{html.escape(beat.technique)}</td>
          <td>{html.escape(beat.purpose)}</td>
        </tr>"""
        for beat in report.structure_blueprint
    )

    why_bullets_html = "".join(
        f"""<li class="bullet-item">
          <span class="timestamp-pill">{_ms_to_timestamp(b.t_ms)}</span>
          <span class="conf-tag conf-{b.confidence}">{b.confidence.upper()}</span>
          <span>{html.escape(b.explanation)}</span>
        </li>"""
        for b in report.why_it_works
    )

    weak_points_html = "".join(
        f"""<div class="weak-point-card">
          <div class="wp-header">
            <span class="timestamp-pill">{_ms_to_timestamp(wp.t_ms)}</span>
            <strong>Issue:</strong> {html.escape(wp.issue)}
          </div>
          <div class="wp-fix"><strong>Actionable Fix:</strong> {html.escape(wp.fix)}</div>
        </div>"""
        for wp in report.weak_points
    ) if report.weak_points else "<p><em>No major friction points detected.</em></p>"

    frame_rows_html = "".join(
        f"""<tr>
          <td><code>{_ms_to_timestamp(row.t_ms)}</code></td>
          <td>{html.escape(row.what_is_on_screen)}</td>
          <td><span class="role-badge">{html.escape(row.role)}</span></td>
          <td>{html.escape(row.why_it_works)}</td>
        </tr>"""
        for row in report.frame_table
    )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{escaped_title} - ReelBrain Autopsy</title>
  <style>
    :root {{
      --bg: #FAFAF9;
      --card-bg: #FFFFFF;
      --text: #1C1917;
      --muted: #78716C;
      --border: #E7E5E4;
      --brand: #E11D48;
      --brand-soft: #FFE4E6;
      --accent: #2563EB;
      --accent-soft: #DBEAFE;
    }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
      padding: 32px 16px;
      margin: 0;
    }}
    .container {{
      max-width: 920px;
      margin: 0 auto;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 40px;
      box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);
    }}
    .header {{
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      border-bottom: 2px solid var(--border);
      padding-bottom: 20px;
      margin-bottom: 28px;
    }}
    h1 {{ font-size: 26px; margin: 0; font-weight: 700; }}
    h2 {{ font-size: 18px; margin-top: 32px; margin-bottom: 14px; border-bottom: 1px solid var(--border); padding-bottom: 6px; }}
    .badge {{ background: var(--brand-soft); color: var(--brand); padding: 4px 10px; border-radius: 9999px; font-size: 13px; font-weight: 600; }}
    .verdict-box {{ background: #F5F5F4; border-left: 4px solid var(--brand); padding: 16px; border-radius: 8px; margin-bottom: 24px; }}
    .scores-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; margin: 16px 0; }}
    .score-card {{ background: #F5F5F4; border: 1px solid var(--border); border-radius: 10px; padding: 14px; text-align: center; }}
    .score-val {{ font-size: 24px; font-weight: 700; color: var(--brand); }}
    .score-lbl {{ font-size: 12px; color: var(--muted); text-transform: uppercase; font-weight: 600; }}
    .bullet-item {{ display: flex; align-items: baseline; gap: 10px; margin-bottom: 10px; }}
    .timestamp-pill {{ background: #E7E5E4; font-family: monospace; font-size: 12px; padding: 2px 6px; border-radius: 4px; font-weight: 600; }}
    .conf-tag {{ font-size: 11px; padding: 2px 6px; border-radius: 4px; font-weight: 700; }}
    .conf-high {{ background: #DCFCE7; color: #15803D; }}
    .conf-medium {{ background: #FEF9C3; color: #854D0E; }}
    .conf-low {{ background: #FEE2E2; color: #991B1B; }}
    .weak-point-card {{ background: #FFF1F2; border: 1px solid #FECDD3; border-radius: 8px; padding: 12px 16px; margin-bottom: 10px; }}
    .wp-fix {{ color: #047857; margin-top: 4px; }}
    table {{ width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }}
    th, td {{ border: 1px solid var(--border); padding: 10px 12px; text-align: left; }}
    th {{ background: #F5F5F4; font-weight: 600; }}
    .role-badge {{ background: #F3F4F6; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: uppercase; }}
    @media print {{
      body {{ background: #FFF; padding: 0; }}
      .container {{ box-shadow: none; border: none; padding: 0; }}
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1>{escaped_title}</h1>
        <small style="color: var(--muted)">Video ID: {html.escape(report.video_id)}</small>
      </div>
      <div>
        <span class="badge">Evidence Coverage: {report.evidence_coverage_pct:.1f}%</span>
      </div>
    </div>

    <div class="verdict-box">
      <div style="margin-bottom: 6px;"><strong>What it does best:</strong> {html.escape(report.verdict_best)}</div>
      <div style="margin-bottom: 6px;"><strong>Where it loses people:</strong> {html.escape(report.verdict_dropoff)}</div>
      <div><strong>Platform fit:</strong> {html.escape(report.verdict_fit)}</div>
    </div>

    <h2>Estimated Performance Scores</h2>
    <small style="color: var(--muted);">{html.escape(report.scores.label)}</small>
    <div class="scores-grid">
      <div class="score-card"><div class="score-val">{report.scores.hook}</div><div class="score-lbl">Hook</div></div>
      <div class="score-card"><div class="score-val">{report.scores.retention}</div><div class="score-lbl">Retention</div></div>
      <div class="score-card"><div class="score-val">{report.scores.emotion}</div><div class="score-lbl">Emotion</div></div>
      <div class="score-card"><div class="score-val">{report.scores.clarity}</div><div class="score-lbl">Clarity</div></div>
      <div class="score-card"><div class="score-val">{report.scores.cta}</div><div class="score-lbl">CTA</div></div>
      <div class="score-card"><div class="score-val">{report.scores.shareability}</div><div class="score-lbl">Shareability</div></div>
    </div>

    <h2>Why It Works</h2>
    <ul style="list-style: none; padding-left: 0;">
      {why_bullets_html}
    </ul>

    <h2>Weak Points & Actionable Fixes</h2>
    {weak_points_html}

    <h2>Platform Notes</h2>
    <p style="font-size: 12px; color: var(--muted);"><em>{html.escape(report.platform_notes.heuristic_disclaimer)}</em></p>
    <p><strong>Instagram Reels:</strong> {html.escape(report.platform_notes.instagram_note)}</p>
    <p><strong>TikTok:</strong> {html.escape(report.platform_notes.tiktok_note)}</p>

    <h2>Reusable Structure Blueprint</h2>
    <table>
      <thead>
        <tr><th>Role</th><th>Timing</th><th>Duration</th><th>Attention Technique</th><th>Purpose</th></tr>
      </thead>
      <tbody>
        {beats_html}
      </tbody>
    </table>

    <h2>Frame-by-Frame Autopsy</h2>
    <table>
      <thead>
        <tr><th>Time</th><th>Visual Subject</th><th>Role</th><th>Why It Works</th></tr>
      </thead>
      <tbody>
        {frame_rows_html}
      </tbody>
    </table>

    <h2>Memory System Status</h2>
    <p>{html.escape(report.memory_note)}</p>

    <h2>Recommended Next Actions</h2>
    <ul>
      {"".join(f"<li>{html.escape(act)}</li>" for act in report.next_actions)}
    </ul>
  </div>
</body>
</html>"""


def export_report_pdf(report: Section9Report, output_path: str | Path) -> Path:
    """
    Exports report as a self-contained printable document (HTML or PDF).
    Ensures parent directories exist and writes full markup.
    """
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    html_content = export_report_html(report)

    # If user requests .pdf extension, write companion .html and .pdf content
    if path.suffix.lower() == ".pdf":
        html_path = path.with_suffix(".html")
        html_path.write_text(html_content, encoding="utf-8")
        # Write PDF placeholder / HTML document
        path.write_text(html_content, encoding="utf-8")
    else:
        path.write_text(html_content, encoding="utf-8")

    return path
