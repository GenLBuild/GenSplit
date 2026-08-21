# GenLayer Intelligent Contract: Payout Screening
#
# Screens a batch of wallet addresses against public sanctions/watchlists
# before a bulk payout is executed in GenSplit.
#
# Uses gl.nondet.web.get to fetch real public OFAC/sanctions data
# and gl.nondet.exec_prompt for LLM-based pattern analysis.
# Validators reach consensus via gl.eq_principle.strict_eq.

# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json

# NOTE: this MUST be an Ethereum-format (0x + 40 hex) address list, since that is
# GenLayer's address format. Verify the exact raw-file path before relying on this
# in production, these repos update their layout over time:
#   https://github.com/ultrasoundmoney/ofac-ethereum-addresses (ETH-only, simplest)
FLAGGED_ADDRESSES_URL = "https://raw.githubusercontent.com/ultrasoundmoney/ofac-ethereum-addresses/main/addresses.json"

class PayoutScreening(gl.Contract):
    """
    GenLayer Intelligent Contract for GenSplit payout address screening.
    Screens a batch of wallet addresses against public sanctions data.
    Returns: {"passed": bool, "flagged": list[str]}
    """

    def __init__(self):
        pass

    @gl.public.write
    def screen_payout(self, wallet_addresses: list) -> dict:
        if not wallet_addresses:
            return {"passed": True, "flagged": []}

        addresses = [str(a).strip().lower() for a in wallet_addresses if a]
        if not addresses:
            return {"passed": True, "flagged": []}

        def parse_screening_result() -> str:
            # Fetch known flagged crypto addresses from public list
            try:
                flagged_raw = gl.nondet.web.get(FLAGGED_ADDRESSES_URL, mode="text")
            except Exception:
                flagged_raw = ""

            screening_prompt = f"""
You are a financial compliance screening system for a crypto payment application.

You must screen the following wallet addresses before allowing a bulk payout:
{json.dumps(addresses)}

Known flagged/sanctioned crypto addresses retrieved from public sources:
---
{flagged_raw[:3000] if flagged_raw else "Could not retrieve public flagged address list."}
---

Your task: Identify which of the submitted addresses (if any) appear in the flagged list above,
OR match known patterns of sanctioned/high-risk addresses.

GenLayer addresses are Ethereum-format (0x + 40 hex chars). Compare case-insensitively.

Respond ONLY with valid JSON in exactly this format:
{{"passed": true_or_false, "flagged": ["0xaddress1", "0xaddress2"]}}

Rules:
1. "flagged" should contain only addresses from the input list that are hits.
2. "passed" is true ONLY if "flagged" is empty.
3. If you could not retrieve the public list, be conservative: pass all unless you have specific knowledge of a hit.
4. Do not flag addresses based on speculation — only confirmed list matches.
5. If no addresses match, return {{"passed": true, "flagged": []}}.
"""
            try:
                result_str = gl.nondet.exec_prompt(screening_prompt)
                cleaned = result_str.strip()
                if cleaned.startswith("```"):
                    lines = cleaned.split("\n")
                    cleaned = "\n".join(lines[1:-1])
                parsed = json.loads(cleaned)
                flagged = [str(a).lower() for a in parsed.get("flagged", []) if a in addresses]
                passed = len(flagged) == 0
                return json.dumps({"passed": passed, "flagged": flagged})
            except (json.JSONDecodeError, KeyError, TypeError):
                return json.dumps({"passed": True, "flagged": []})

        final_json = gl.eq_principle.strict_eq(parse_screening_result)
        return json.loads(final_json)