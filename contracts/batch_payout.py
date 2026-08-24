# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *

class BatchPayout(gl.Contract):
    """
    Accepts one GEN transfer covering a whole batch, then forwards it
    to each recipient in a single write call — one signature, many payouts.
    """

    def __init__(self):
        pass

    @gl.public.write.payable
    def batch_send(self, recipients: list, amounts: list) -> dict:
        if len(recipients) != len(amounts):
            return {"success": False, "reason": "recipients/amounts length mismatch"}

        total_requested = sum(int(a) for a in amounts)
        if total_requested > gl.message.value:
            return {"success": False, "reason": "sent value does not cover total amounts"}

        sent = []
        for addr, amt in zip(recipients, amounts):
            gl.evm.send(Address(addr), int(amt))
            sent.append(addr)

        return {"success": True, "sent": sent}