# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *

@gl.evm.contract_interface
class _Recipient:
    class View:
        pass
    class Write:
        pass

class BatchPayout(gl.Contract):
    """
    Accepts one GEN transfer covering a whole batch, then forwards it
    to each recipient (EOA wallet) in a single write call.
    """

    def __init__(self):
        pass

    @gl.public.write.payable
    def batch_send(self, recipients: list, amounts: list) -> dict:
        if len(recipients) != len(amounts):
            return {"success": False, "reason": "recipients/amounts length mismatch"}

        total_requested = sum(int(a) for a in amounts)
        if u256(total_requested) > gl.message.value:
            return {"success": False, "reason": "sent value does not cover total amounts"}

        sent = []
        for addr, amt in zip(recipients, amounts):
            _Recipient(Address(addr)).emit_transfer(value=u256(int(amt)))
            sent.append(addr)

        return {"success": True, "sent": sent}