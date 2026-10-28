"""
ReelBrain Memory Engine (Brain).
Stores, indexes, and categorizes frame-by-frame analysis data across all analyzed videos.
Extracts cross-video patterns (hook archetypes, pacing rhythms, visual aesthetics, narrative blueprints)
to guide and power the creation of high-converting new videos in Remix Studio.
"""

import json
import logging
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

logger = logging.getLogger("reelbrain.brain")

STORAGE_DIR = Path("storage")
BRAIN_MEMORY_FILE = STORAGE_DIR / "brain_memory.json"
ANALYSES_DIR = STORAGE_DIR / "analyses"


class BrainMemoryEngine:
    """
    Persistent Knowledge Engine that retains frame-by-frame forensics and synthesis
    across all uploaded videos, extracting cross-clip intelligence for new video generation.
    """

    def __init__(self, memory_path: Path = BRAIN_MEMORY_FILE):
        self.memory_path = memory_path
        self.memory_path.parent.mkdir(parents=True, exist_ok=True)
        self.data: dict[str, Any] = self._load()

    def _load(self) -> dict[str, Any]:
        if self.memory_path.exists():
            try:
                with open(self.memory_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Failed to load brain memory file: {e}")

        # Default empty brain state
        return {
            "version": "1.0",
            "last_updated": datetime.now(UTC).isoformat(),
            "videos": {},
            "categories": {
                "e_commerce": [],
                "saas_app": [],
                "creator_ugc": [],
                "lifestyle": [],
                "general": [],
            },
            "patterns": {
                "hooks": [],
                "pacing": {},
                "styles": [],
                "blueprints": [],
            },
            "metrics": {
                "total_videos": 0,
                "total_frames_analyzed": 0,
                "avg_hook_score": 0.0,
                "avg_retention_score": 0.0,
            },
        }

    def save(self) -> None:
        """Persists brain state to storage/brain_memory.json."""
        self.data["last_updated"] = datetime.now(UTC).isoformat()
        try:
            with open(self.memory_path, "w", encoding="utf-8") as f:
                json.dump(self.data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Failed to persist brain memory: {e}")

    def detect_category(self, transcript_text: str, verdict: str, ocr_texts: list[str]) -> str:
        """Categorizes video into a strategic niche based on semantic keywords."""
        corpus = f"{transcript_text} {verdict} {' '.join(ocr_texts)}".lower()

        if any(w in corpus for w in ["software", "app", "tool", "saas", "dashboard", "ai", "platform", "screen", "workflow"]):
            return "saas_app"
        if any(w in corpus for w in ["unboxing", "review", "tried", "honest", "my experience", "vlog", "day in the life"]):
            return "creator_ugc"
        if any(w in corpus for w in ["bottle", "ceramic", "tumbler", "skin", "wear", "shirt", "shoe", "box", "buy", "discount", "order", "shipping"]):
            return "e_commerce"
        if any(w in corpus for w in ["routine", "morning", "coffee", "gym", "workout", "wellness", "habit"]):
            return "lifestyle"

        return "e_commerce"  # Default e-commerce/product focus

    def index_video(self, video_id: str, pipeline_data: dict[str, Any]) -> dict[str, Any]:
        """
        Ingests and memorizes an individual video's frame-by-frame and autopsy data.
        Updates aggregated patterns and scoring matrix.
        """
        metadata = pipeline_data.get("metadata", {})
        analysis = pipeline_data.get("analysis", {})
        frames = pipeline_data.get("frames", [])
        scenes = pipeline_data.get("scenes", [])
        transcript = pipeline_data.get("transcript", {})
        ocr = pipeline_data.get("ocr", [])
        audio_features = pipeline_data.get("audio_features", {})

        transcript_text = transcript.get("text", "")
        ocr_strings = [t.get("text", "") for item in ocr for t in item.get("texts", [])]
        verdict = analysis.get("verdict", "")
        scores = analysis.get("scores", {})
        blueprint = analysis.get("blueprint", [])
        why_it_works = analysis.get("why_it_works", [])
        design = analysis.get("design_language", {})

        category = self.detect_category(transcript_text, verdict, ocr_strings)

        # 1. Extract Hook Forensic DNA (First 0-3 Seconds)
        hook_frames = [f for f in frames if f.get("t_ms", 0) <= 3000]
        hook_words = [
            w.get("w", "") for w in transcript.get("words", [])
            if w.get("start_ms", 0) <= 3000
        ]
        hook_ocr = [t for t in ocr_strings if t][:3]

        hook_role = blueprint[0] if blueprint else {}
        hook_technique = hook_role.get("technique", "Pattern interrupt opening")

        # Determine Hook Archetype
        hook_type = "Pattern Interrupt"
        if any(w in " ".join(hook_words).lower() for w in ["why", "how", "what", "secret", "never"]):
            hook_type = "Negative Curiosity"
        elif any(w in " ".join(hook_words).lower() for w in ["stop", "don't", "worst", "mistake"]):
            hook_type = "Contrarian Warning"
        elif len(hook_frames) >= 4 and len(scenes) > 0 and scenes[0].get("end_ms", 3000) <= 2000:
            hook_type = "Micro-Cut Visual Shock"
        elif "problem" in hook_role.get("role", ""):
            hook_type = "Visceral Problem Agitation"

        # 2. Extract Pacing Metrics
        duration_s = metadata.get("duration_s", 15.0)
        cuts_count = max(len(scenes) - 1, 1)
        cuts_per_min = round((cuts_count / max(duration_s, 1.0)) * 60, 1)
        cut_rhythm_s = round(duration_s / max(cuts_count, 1), 2)
        silence_ratio = 0.0
        if audio_features.get("silence_gaps"):
            total_silence_ms = sum(g.get("duration_ms", 0) for g in audio_features["silence_gaps"])
            silence_ratio = round(total_silence_ms / (duration_s * 1000), 2)

        # Extract Virality & Social Telemetry
        stats = pipeline_data.get("stats", [])
        social_metadata = pipeline_data.get("social_metadata", {})
        analysis_virality = analysis.get("virality_telemetry", {})

        stat_map = {s.get("metric"): float(s.get("value", 0)) for s in stats if "metric" in s}
        views = stat_map.get("views", analysis_virality.get("views", 0.0))
        likes = stat_map.get("likes", analysis_virality.get("likes", 0.0))
        shares = stat_map.get("shares", analysis_virality.get("shares", 0.0))
        comments = stat_map.get("comments", analysis_virality.get("comments", 0.0))

        like_ratio = (likes / views * 100.0) if views > 0 else 0.0
        share_ratio = (shares / views * 100.0) if views > 0 else 0.0

        if likes >= 1_000_000 or views >= 10_000_000:
            v_tier = "Tier-1 Mega-Viral Unicorn"
        elif likes >= 100_000 or views >= 1_000_000:
            v_tier = "Tier-2 Viral Breakthrough"
        elif likes >= 10_000 or views >= 100_000:
            v_tier = "Tier-3 High Performer"
        else:
            v_tier = "Tier-4 Organic Distribution"

        virality_data = {
            "tier": analysis_virality.get("tier", v_tier),
            "views": views,
            "likes": likes,
            "shares": shares,
            "comments": comments,
            "like_ratio": round(like_ratio, 2),
            "share_ratio": round(share_ratio, 2),
            "archetype": analysis_virality.get("archetype", hook_type),
            "source": stats[0].get("source", "connector") if stats else "acoustic_heuristic",
            "social_metadata": social_metadata,
        }

        # 3. Assemble Video Memory Record
        memory_record = {
            "video_id": video_id,
            "indexed_at": datetime.now(UTC).isoformat(),
            "category": category,
            "duration_s": duration_s,
            "frame_count": len(frames),
            "virality": virality_data,
            "scores": {
                "hook": scores.get("hook", 85),
                "retention": scores.get("retention", 82),
                "emotion": scores.get("emotion", 80),
                "clarity": scores.get("clarity", 88),
                "cta": scores.get("cta", 84),
                "composite": scores.get("sales_potential_estimate") or round(
                    scores.get("hook", 85) * 0.35 +
                    scores.get("retention", 82) * 0.25 +
                    scores.get("emotion", 80) * 0.20 +
                    scores.get("clarity", 88) * 0.20
                ),
            },
            "hook_dna": {
                "type": analysis_virality.get("archetype", hook_type),
                "technique": hook_technique,
                "first_3s_words": " ".join(hook_words),
                "opening_ocr": hook_ocr,
                "hold_score": scores.get("hook", 85),
            },
            "pacing_dna": {
                "cuts_count": cuts_count,
                "cuts_per_minute": cuts_per_min,
                "cut_rhythm_s": cut_rhythm_s,
                "silence_ratio": silence_ratio,
            },
            "style_dna": {
                "palette": design.get("palette", ["#171717", "#FAFAFA"]),
                "lighting": design.get("lighting", "Natural studio lighting"),
                "motion": design.get("motion_style", "Dynamic tracking"),
            },
            "blueprint": [
                {
                    "role": b.get("role", "beat"),
                    "technique": b.get("technique", ""),
                    "duration_ms": max(b.get("t_end_ms", 0) - b.get("t_start_ms", 0), 1000),
                }
                for b in blueprint
            ],
            "why_it_works_claims": [
                {"category": item.get("category"), "claim": item.get("claim")}
                for item in why_it_works[:3]
            ],
        }

        # Store in Brain dictionary
        self.data["videos"][video_id] = memory_record

        # Update categories
        if video_id not in self.data["categories"].setdefault(category, []):
            self.data["categories"][category].append(video_id)

        # Re-aggregate global Brain patterns
        self._reaggregate_patterns()
        self.save()

        logger.info(f"Brain successfully indexed video {video_id} in category '{category}' with tier '{virality_data['tier']}'")
        return memory_record

    def _reaggregate_patterns(self) -> None:
        """Computes statistical patterns and top performing formulas across all stored videos."""
        videos = list(self.data["videos"].values())
        if not videos:
            return

        total_videos = len(videos)
        total_frames = sum(v["frame_count"] for v in videos)
        total_views = sum(v.get("virality", {}).get("views", 0) for v in videos)
        total_likes = sum(v.get("virality", {}).get("likes", 0) for v in videos)
        avg_hook = round(sum(v["scores"]["hook"] for v in videos) / total_videos, 1)
        avg_retention = round(sum(v["scores"]["retention"] for v in videos) / total_videos, 1)

        mega_virals = [
            {
                "video_id": v["video_id"],
                "tier": v.get("virality", {}).get("tier", "Tier-1 Mega-Viral Unicorn"),
                "views": v.get("virality", {}).get("views", 0),
                "likes": v.get("virality", {}).get("likes", 0),
                "shares": v.get("virality", {}).get("shares", 0),
                "like_ratio": v.get("virality", {}).get("like_ratio", 0),
                "hook_type": v["hook_dna"]["type"],
                "technique": v["hook_dna"]["technique"],
                "author": v.get("virality", {}).get("social_metadata", {}).get("author", ""),
                "title": v.get("virality", {}).get("social_metadata", {}).get("title", ""),
            }
            for v in videos
            if v.get("virality", {}).get("tier") == "Tier-1 Mega-Viral Unicorn"
            or v.get("virality", {}).get("likes", 0) >= 1_000_000
            or v.get("virality", {}).get("views", 0) >= 10_000_000
        ]

        self.data["metrics"] = {
            "total_videos": total_videos,
            "total_frames_analyzed": total_frames,
            "total_views_analyzed": total_views,
            "total_likes_analyzed": total_likes,
            "mega_viral_count": len(mega_virals),
            "avg_hook_score": avg_hook,
            "avg_retention_score": avg_retention,
        }
        self.data["patterns"]["mega_viral_hall_of_fame"] = mega_virals

        # 1. Aggregate Hook Formulas
        hook_types: dict[str, list[dict[str, Any]]] = {}
        for v in videos:
            htype = v["hook_dna"]["type"]
            hook_types.setdefault(htype, []).append(v)

        hook_patterns = []
        for htype, vids in hook_types.items():
            avg_hold = round(sum(item["scores"]["hook"] for item in vids) / len(vids), 1)
            sample_techniques = list({item["hook_dna"]["technique"] for item in vids})[:2]
            hook_patterns.append({
                "archetype": htype,
                "frequency": len(vids),
                "avg_hook_score": avg_hold,
                "techniques": sample_techniques,
                "recommended_for": "Fast-scroll feeds (TikTok & Instagram Reels)",
            })

        hook_patterns.sort(key=lambda x: x["avg_hook_score"], reverse=True)
        self.data["patterns"]["hooks"] = hook_patterns

        # 2. Aggregate Pacing Intelligence
        avg_cuts_pm = round(sum(v["pacing_dna"]["cuts_per_minute"] for v in videos) / total_videos, 1)
        avg_rhythm_s = round(sum(v["pacing_dna"]["cut_rhythm_s"] for v in videos) / total_videos, 2)
        avg_silence = round(sum(v["pacing_dna"]["silence_ratio"] for v in videos) / total_videos, 2)

        self.data["patterns"]["pacing"] = {
            "avg_cuts_per_minute": avg_cuts_pm,
            "avg_cut_rhythm_s": avg_rhythm_s,
            "optimal_silence_ratio": avg_silence,
            "recommendation": f"Pace cuts every {avg_rhythm_s}s ({avg_cuts_pm} cuts/min) to maximize viewer momentum without disorientation.",
        }

        # 3. Aggregate Visual Styles
        all_palettes = [c for v in videos for c in v["style_dna"].get("palette", []) if c.startswith("#")]
        palette_counts: dict[str, int] = {}
        for c in all_palettes:
            palette_counts[c] = palette_counts.get(c, 0) + 1
        top_colors = sorted(palette_counts.keys(), key=lambda k: palette_counts[k], reverse=True)[:6]

        self.data["patterns"]["styles"] = {
            "top_palette_accents": top_colors or ["#171717", "#FAFAFA", "#5A5A5A"],
            "dominant_camera_motions": ["Push-in macro (Hook)", "Dynamic handheld tracking (Problem)", "Smooth linear slider (Payoff)"],
            "lighting_formula": "Soft directional 45° key light with subtle rim separation.",
        }

        # 4. Proven Narrative Blueprints
        blueprints_map: dict[str, list[int]] = {}
        for v in videos:
            roles_seq = " → ".join(b["role"].capitalize() for b in v.get("blueprint", []))
            if roles_seq:
                blueprints_map.setdefault(roles_seq, []).append(v["scores"]["composite"])

        blueprint_patterns = []
        for seq, scores_list in blueprints_map.items():
            blueprint_patterns.append({
                "sequence": seq,
                "occurrences": len(scores_list),
                "avg_composite_score": round(sum(scores_list) / len(scores_list), 1),
            })
        blueprint_patterns.sort(key=lambda x: x["avg_composite_score"], reverse=True)
        self.data["patterns"]["blueprints"] = blueprint_patterns[:4]

    def sync_existing_analyses(self) -> int:
        """Scans storage/analyses and indexes any unindexed pipeline_data.json files."""
        if not ANALYSES_DIR.exists():
            return 0

        synced = 0
        for vid_dir in ANALYSES_DIR.iterdir():
            if not vid_dir.is_dir():
                continue
            pipe_file = vid_dir / "pipeline_data.json"
            if pipe_file.exists():
                try:
                    with open(pipe_file, "r", encoding="utf-8") as f:
                        pdata = json.load(f)
                    vid_id = pdata.get("video_id") or vid_dir.name
                    if vid_id not in self.data["videos"]:
                        self.index_video(vid_id, pdata)
                        synced += 1
                except Exception as e:
                    logger.debug(f"Could not sync {pipe_file}: {e}")

        logger.info(f"Brain synchronized {synced} historical video analyses.")
        return synced

    def get_brain_summary(self) -> dict[str, Any]:
        """Returns the high-level metrics, pattern taxonomy, and video memory archive."""
        return {
            "metrics": self.data.get("metrics", {}),
            "patterns": self.data.get("patterns", {}),
            "creator_psychology_rules": self.data.get("creator_psychology_rules", []),
            "categories": {
                k: len(v) for k, v in self.data.get("categories", {}).items()
            },
            "videos": [
                {
                    "video_id": v["video_id"],
                    "category": v["category"],
                    "duration_s": v["duration_s"],
                    "composite_score": v["scores"]["composite"],
                    "hook_type": v["hook_dna"]["type"],
                    "cut_rhythm_s": v["pacing_dna"]["cut_rhythm_s"],
                    "indexed_at": v["indexed_at"],
                    "views": v.get("virality", {}).get("views", 0),
                    "likes": v.get("virality", {}).get("likes", 0),
                    "shares": v.get("virality", {}).get("shares", 0),
                    "virality_tier": v.get("virality", {}).get("tier", "Tier-4 Organic"),
                    "creator_thoughts": v.get("creator_thoughts"),
                }
                for v in self.data.get("videos", {}).values()
            ],
            "last_updated": self.data.get("last_updated"),
        }

    def learn_creator_thought(self, video_id: str, thought: dict[str, Any]) -> dict[str, Any]:
        """
        Stores user-provided viral psychology insights, building blocks, and thoughts
        for a specific video and indexes them into the global cross-video intelligence network.
        """
        now_iso = datetime.now(UTC).isoformat()
        video_rec = self.data.get("videos", {}).get(video_id, {})
        category = video_rec.get("category", "general")
        tier = video_rec.get("virality", {}).get("tier", "Viral")

        thought_record = {
            "video_id": video_id,
            "created_at": now_iso,
            "category": category,
            "virality_tier": tier,
            "what": thought.get("what", "").strip(),
            "why": thought.get("why", "").strip(),
            "how": thought.get("how", "").strip(),
            "psychology": thought.get("psychology", "").strip(),
            "visual_build": thought.get("visual_build", "").strip(),
            "notes": thought.get("notes", "").strip(),
            "tags": thought.get("tags") or [],
        }

        # 1. Attach to specific video
        if "videos" not in self.data:
            self.data["videos"] = {}
        if video_id in self.data["videos"]:
            self.data["videos"][video_id]["creator_thoughts"] = thought_record

        # 2. Add to global psychology learnings
        if "creator_psychology_rules" not in self.data:
            self.data["creator_psychology_rules"] = []

        # Remove previous entry for this video if updating
        self.data["creator_psychology_rules"] = [
            r for r in self.data["creator_psychology_rules"] if r.get("video_id") != video_id
        ]
        self.data["creator_psychology_rules"].insert(0, thought_record)

        self.save()

        # Also write to storage/analyses/{video_id}/creator_thoughts.json
        try:
            target_analysis_dir = ANALYSES_DIR / video_id
            target_analysis_dir.mkdir(parents=True, exist_ok=True)
            with open(target_analysis_dir / "creator_thoughts.json", "w", encoding="utf-8") as f:
                json.dump(thought_record, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.warning(f"Could not write creator_thoughts.json: {e}")

        logger.info(f"Brain memorized creator psychology thought for video {video_id} ({len(self.data['creator_psychology_rules'])} total rules learned)")
        return thought_record

    def get_creator_thoughts(self, video_id: str) -> dict[str, Any] | None:
        """Retrieves creator thoughts for a video if available."""
        if video_id in self.data.get("videos", {}) and "creator_thoughts" in self.data["videos"][video_id]:
            return self.data["videos"][video_id]["creator_thoughts"]
        
        file_path = ANALYSES_DIR / video_id / "creator_thoughts.json"
        if file_path.exists():
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
        return None

    def get_creation_recommendations(
        self,
        product_or_topic: str,
        platform: str = "reels",
        target_duration_s: int = 30,
        goal: str = "conversions",
    ) -> dict[str, Any]:
        """
        Synthesizes knowledge across ALL analyzed videos in the Brain to give actionable
        guidelines and prompt formulas for generating a winning new video concept.
        """
        videos = list(self.data["videos"].values())
        top_hooks = self.data.get("patterns", {}).get("hooks", [])
        pacing = self.data.get("patterns", {}).get("pacing", {})
        blueprints = self.data.get("patterns", {}).get("blueprints", [])
        creator_rules = self.data.get("creator_psychology_rules", [])

        # Best Hook Formula from Brain
        best_hook = top_hooks[0] if top_hooks else {
            "archetype": "Pattern Interrupt & Shock",
            "avg_hook_score": 91.0,
            "techniques": ["Macro lens push-in with rapid audio onset"],
        }

        # Best Blueprint sequence
        best_blueprint = blueprints[0]["sequence"] if blueprints else "Hook → Problem → Demo → CTA"

        # Calculated target cuts for the requested duration
        ideal_rhythm = pacing.get("avg_cut_rhythm_s", 1.8)
        target_cuts_count = max(int(target_duration_s / max(ideal_rhythm, 1.0)), 4)

        # Style Lock Recommendation
        style_prompt = (
            f"STYLE LOCK: stark minimal studio aesthetic, near-black ink #171717 and neutral #FAFAFA tones, "
            f"natural crisp key lighting, 35mm shallow depth of field, dynamic smooth camera tracking, "
            f"9:16 vertical {platform.capitalize()} format, high visual clarity, zero watermark, photorealistic."
        )

        return {
            "product_or_topic": product_or_topic,
            "target_platform": platform,
            "target_duration_s": target_duration_s,
            "recommended_hook": {
                "archetype": best_hook.get("archetype"),
                "proven_hold_rate": f"{best_hook.get('avg_hook_score')}% (Brain Empirical Average)",
                "opening_shot_technique": best_hook.get("techniques", ["Macro push-in"])[0],
                "sample_line": f"Stop using conventional alternatives for {product_or_topic} until you see this.",
            },
            "recommended_pacing": {
                "optimal_cut_rhythm": f"1 cut every {ideal_rhythm}s",
                "recommended_shots_count": target_cuts_count,
                "dead_air_silence_cap": "< 5% (keep voiceover continuous per Rule 21)",
            },
            "recommended_blueprint": best_blueprint,
            "recommended_style_lock": style_prompt,
            "creator_psychology_rules": creator_rules[:5],
            "supporting_memory_count": len(videos),
            "intelligence_source": f"Synthesized from {len(videos)} videos and {self.data.get('metrics', {}).get('total_frames_analyzed', 0)} frames + {len(creator_rules)} creator psychology rules in ReelBrain memory.",
        }


# Global singleton instance
brain_memory = BrainMemoryEngine()
