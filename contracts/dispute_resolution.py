# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json

class DisputeResolution(gl.Contract):
    def __init__(self):
        pass

    @gl.public.write
    def resolve_dispute(
        self,
        split_member_id: str,
        claim_text: str,
        txn_hash: str,
        expected_wallet: str,
        expected_amount_wei: str,
        onchain_verified: bool,
    ) -> dict:
        if not split_member_id or not claim_text:
            return {"fulfilled": False, "reasoning": "Missing required evidence fields."}

        def parse_result() -> str:
            evidence_summary = f"""
You are an impartial dispute resolver for a crypto payment splitting application called GenSplit.

A dispute has been submitted for split member ID: {split_member_id}

Claim submitted by the disputing party:
---
{claim_text}
---

Independent on-chain verification result (ground truth, computed deterministically before this call): {onchain_verified}

Rules:
1. If on-chain verification is True, rule fulfilled=true.
2. If on-chain verification is False, judge based on the claim text alone: nonsensical/empty claims -> false, credible technical-issue explanations -> false with guidance, otherwise use judgment.
3. Always prioritize the on-chain verification result over the claim text when it is True.
4. Be concise and fair in your reasoning.

Respond ONLY with valid JSON in exactly this format:
{{"fulfilled": true_or_false, "reasoning": "one or two sentence explanation"}}

Do not add any text outside the JSON.
"""
            try:
                result_str = gl.nondet.exec_prompt(evidence_summary)
                cleaned = result_str.strip()
                if cleaned.startswith("```"):
                    lines = cleaned.split("\n")
                    cleaned = "\n".join(lines[1:-1])
                parsed = json.loads(cleaned)
                fulfilled = bool(parsed.get("fulfilled", False))
                reasoning = str(parsed.get("reasoning", "No reasoning provided."))[:500]
                return json.dumps({"fulfilled": fulfilled, "reasoning": reasoning})
            except (json.JSONDecodeError, KeyError, TypeError):
                return json.dumps({
                    "fulfilled": False,
                    "reasoning": f"Could not parse LLM response. Raw: {result_str[:200]}"
                })

        final_json = gl.eq_principle.strict_eq(parse_result)
        return json.loads(final_json)