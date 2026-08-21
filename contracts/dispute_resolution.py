# GenLayer Intelligent Contract: Dispute Resolution
# 
# Resolves payment disputes for GenSplit splits.
# Uses gl.nondet.exec_prompt (LLM) to weigh evidence and 
# gl.eq_principle.strict_eq for cross-validator consensus.
#
# Deploy via GenLayer Studio: https://studio.genlayer.com/contracts
# Test using Studio's Read/Write Methods panel and Node Logs before wiring frontend.

# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json
import re

class DisputeResolution(gl.Contract):
    """
    GenLayer Intelligent Contract for GenSplit dispute resolution.
    
    Accepts evidence (claim text + optional tx hash) and uses an LLM
    to weigh the evidence. Validators reach consensus via strict equality.
    """

    def __init__(self):
        # No persistent state needed — each dispute is stateless
        pass

    @gl.public.write
    def resolve_dispute(
        self,
        split_member_id: str,
        claim_text: str,
        txn_hash: str
    ) -> dict:
        """
        Resolve a dispute for a GenSplit payment.
        
        Args:
            split_member_id: UUID of the split_members row being disputed
            claim_text: Human-readable claim text submitted as evidence
            txn_hash: Optional GenLayer transaction hash proving payment
            
        Returns:
            {"fulfilled": bool, "reasoning": str}
        """

        # Validate inputs
        if not split_member_id or not claim_text:
            return {"fulfilled": False, "reasoning": "Missing required evidence fields."}

        # Check tx hash format — a valid GenLayer tx hash is 0x + 64 hex chars
        has_valid_txhash = bool(
            txn_hash and re.match(r'^0x[0-9a-fA-F]{64}$', txn_hash.strip())
        )

        # Build the evidence summary for the LLM
        evidence_summary = f"""
You are an impartial dispute resolver for a crypto payment splitting application called GenSplit.

A dispute has been submitted for split member ID: {split_member_id}

Claim submitted by the disputing party:
---
{claim_text}
---

Transaction hash provided: {"Yes — " + txn_hash if has_valid_txhash else "None provided or invalid format"}

Your task: Determine whether the payment should be considered FULFILLED based on the evidence.

Rules:
1. If a valid transaction hash (0x + 64 hex chars) is provided AND the claim is coherent and credible, lean towards fulfilled=true.
2. If no valid transaction hash is provided but the claim text contains compelling evidence (e.g., screenshots described, confirmation numbers), you may still rule fulfilled=true.
3. If the claim text is empty, nonsensical, or purely accusatory without evidence, rule fulfilled=false.
4. If the claim text describes a legitimate technical issue (wallet error, network failure, etc.), rule fulfilled=false and explain what is needed.
5. Be concise and fair in your reasoning.

Respond ONLY with valid JSON in exactly this format:
{{"fulfilled": true_or_false, "reasoning": "one or two sentence explanation"}}

Do not add any text outside the JSON.
"""

        # Parse and validate the result using equivalence principle
        def parse_result() -> str:
            try:
                # Use GenLayer's nondeterministic LLM execution inside the eq_principle block
                result_str = gl.nondet.exec_prompt(evidence_summary)
                # Strip markdown code fences if present
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

        # Validators reach consensus via strict equality on the JSON output
        final_json = gl.eq_principle.strict_eq(parse_result)
        return json.loads(final_json)
