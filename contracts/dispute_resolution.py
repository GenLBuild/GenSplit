# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json
import re

class DisputeResolution(gl.Contract):
    """
    GenLayer Intelligent Contract for GenSplit dispute resolution.
    Fetches the real on-chain transaction (via the GenLayer block explorer API)
    and checks it against the split's actual amount/recipient before judging.
    """

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
    ) -> dict:
        if not split_member_id or not claim_text:
            return {"fulfilled": False, "reasoning": "Missing required evidence fields."}

        has_valid_txhash = bool(
            txn_hash and re.match(r'^0x[0-9a-fA-F]{64}$', txn_hash.strip())
        )

        def parse_result() -> str:
            verification_summary = "No transaction hash provided — nothing to verify on-chain."
            onchain_verified = False

            if has_valid_txhash:
                try:
                    api_url = f"https://explorer.testnet-chain.genlayer.com/api/v2/transactions/{txn_hash.strip()}"
                    raw = gl.nondet.web.get(api_url, mode="text")
                    tx_data = json.loads(raw)

                    actual_to = str(tx_data.get("to", {}).get("hash", "")).lower()
                    actual_value = str(tx_data.get("value", ""))
                    expected_to = expected_wallet.strip().lower()

                    to_matches = actual_to == expected_to
                    value_matches = actual_value == str(expected_amount_wei).strip()

                    onchain_verified = to_matches and value_matches
                    verification_summary = (
                        f"On-chain lookup succeeded. Recipient match: {to_matches} "
                        f"(chain: {actual_to}, expected: {expected_to}). "
                        f"Amount match: {value_matches} "
                        f"(chain: {actual_value} wei, expected: {expected_amount_wei} wei)."
                    )
                except Exception as e:
                    verification_summary = f"Could not fetch/parse on-chain transaction data: {str(e)[:200]}"

            evidence_summary = f"""
You are an impartial dispute resolver for a crypto payment splitting application called GenSplit.

A dispute has been submitted for split member ID: {split_member_id}

Claim submitted by the disputing party:
---
{claim_text}
---

Transaction hash provided: {"Yes — " + txn_hash if has_valid_txhash else "None provided or invalid format"}

Independent on-chain verification result (ground truth, not from the claimant):
---
{verification_summary}
---

Your task: Determine whether the payment should be considered FULFILLED.

Rules:
1. If on-chain verification confirms the transaction matches the expected recipient and amount, rule fulfilled=true.
2. If on-chain verification explicitly shows a mismatch (wrong recipient or wrong amount), rule fulfilled=false regardless of the claim text.
3. If no transaction hash was provided or on-chain data could not be fetched, judge based on claim text alone per the original rules: nonsensical/empty claims -> false, credible technical-issue explanations -> false with guidance, otherwise use judgment.
4. Always prioritize the on-chain verification result over the claim text when both are available.
5. Be concise and fair in your reasoning, and mention whether on-chain verification was used.

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