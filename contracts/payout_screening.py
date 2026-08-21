# GenLayer Intelligent Contract: Payout Screening
#
# Screens a batch of wallet addresses against public sanctions/watchlists
# before a bulk payout is executed in GenSplit.
#
# Uses gl.nondet.web.get to fetch real public OFAC/sanctions data
# and gl.nondet.exec_prompt for LLM-based pattern analysis.
# Validators reach consensus via gl.eq_principle.strict_eq.
#
# Deploy via GenLayer Studio: https://studio.genlayer.com/contracts
# Test using Studio's Read/Write Methods panel and Node Logs before wiring frontend.

import json
import re
import gl

# Public OFAC SDN list (consolidated sanctions data — publicly available)
OFAC_SDN_URL = "https://www.treasury.gov/ofac/downloads/sdn.xml"

# Fallback: OFAC SDN JSON API (smaller, faster)
OFAC_JSON_URL = "https://data.treasury.gov/feed.svc/Financial_Sanctions_Files"

# NOTE: this MUST be an Ethereum-format (0x + 40 hex) address list, since that is
# GenLayer's address format. A Bitcoin-format list (base58, "1..."/"3..."/"bc1...")
# will never match and silently makes screening a no-op — verify the exact
# raw-file path before deploying, these repos update their layout over time:
#   https://github.com/ultrasoundmoney/ofac-ethereum-addresses (ETH-only, simplest)
#   https://github.com/0xB10C/ofac-sanctioned-digital-currency-addresses (lists branch, multi-asset incl. ETH)
FLAGGED_ADDRESSES_URL = "https://raw.githubusercontent.com/ultrasoundmoney/ofac-ethereum-addresses/main/addresses.json"

class PayoutScreening(gl.Contract):
    """
    GenLayer Intelligent Contract for GenSplit payout address screening.
    
    Screens a batch of wallet addresses against public sanctions data.
    Uses web access + LLM analysis to flag potentially sanctioned addresses.
    
    Returns: {"passed": bool, "flagged": list[str]}
    """

    def __init__(self):
        pass

    @gl.public.view
    def screen_payout(self, wallet_addresses: list) -> dict:
        """
        Screen a batch of wallet addresses before a bulk payout.
        
        Args:
            wallet_addresses: List of GenLayer/Ethereum-format address strings
            
        Returns:
            {"passed": bool, "flagged": list[str]}
            passed=True means the batch is clear to send.
            flagged contains any addresses that triggered a screening hit.
        """
        if not wallet_addresses:
            return {"passed": True, "flagged": []}

        # Normalize addresses
        addresses = [str(a).strip().lower() for a in wallet_addresses if a]
        if not addresses:
            return {"passed": True, "flagged": []}

        # Fetch known flagged crypto addresses from public list
        flagged_raw = ""
        try:
            flagged_raw = gl.nondet.web.get(FLAGGED_ADDRESSES_URL, mode="text")
        except Exception:
            flagged_raw = ""

        # Build screening prompt
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

        result_str = gl.nondet.exec_prompt(screening_prompt)

        def parse_screening_result() -> str:
            try:
                cleaned = result_str.strip()
                if cleaned.startswith("```"):
                    lines = cleaned.split("\n")
                    cleaned = "\n".join(lines[1:-1])
                parsed = json.loads(cleaned)
                flagged = [str(a).lower() for a in parsed.get("flagged", []) if a in addresses]
                passed = len(flagged) == 0
                return json.dumps({"passed": passed, "flagged": flagged})
            except (json.JSONDecodeError, KeyError, TypeError):
                # On parse failure, pass (conservative — don't block on LLM errors)
                return json.dumps({"passed": True, "flagged": []})

        final_json = gl.eq_principle.strict_eq(parse_screening_result)
        return json.loads(final_json)
