# Competitor Analysis Outputs

Location: `tests/competitors/`

This folder preserves baseline outputs from competitor video scoring/analysis tools (such as ViralOS, ContentHooks, HookIQ, Foreplay, Motion) tested against the same golden videos (`g1` through `g5`).

## Comparison Objectives
In Phase 2, FrameDNA outputs will be directly evaluated side-by-side against these competitor outputs:
1. **Timestamped Evidence Coverage:** FrameDNA must provide explicit frame/second timestamps for claims (competitors typically provide generic overall scores).
2. **Structural Blueprint:** FrameDNA produces an ordered sequence of structural beats and techniques.
3. **Specific Actionable Fixes:** Rank-ordered edits tied to exact timeline ranges.

## File Naming Convention
- `tests/competitors/{tool_name}_{video_id}_report.json` or `.md` (e.g. `viralos_g1_report.json`)
