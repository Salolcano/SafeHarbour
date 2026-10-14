# v0.2.17
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
import json
import typing


class SafeHarbor(gl.Contract):
    slas: TreeMap[u256, str]
    epochs: TreeMap[str, str]
    bonds: TreeMap[Address, u256]
    sla_count: u256
    epoch_count: u256

    def __init__(self):
        self.sla_count = u256(0)
        self.epoch_count = u256(0)

    @gl.public.write
    def create_sla(
        self,
        agent_address: str,
        service_name: str,
        sla_terms: str,
        monitoring_url: str,
        duration_days: int,
        bond_amount: int,
    ) -> u256:
        sla_id = self.sla_count
        payload = {
            "id": int(sla_id),
            "client": gl.message.sender_address.as_hex,
            "agent": agent_address,
            "service_name": service_name,
            "sla_terms": sla_terms,
            "monitoring_url": monitoring_url,
            "duration_days": duration_days,
            "bond_amount": bond_amount,
            "bond_staked": 0,
            "status": "awaiting_bond",
            "epochs_passed": 0,
            "epochs_failed": 0,
            "created_at": int(gl.message.block_timestamp),
        }
        self.slas[sla_id] = json.dumps(payload)
        self.sla_count = sla_id + u256(1)
        return sla_id

    @gl.public.write.payable
    def stake_bond(self, sla_id: u256) -> None:
        if sla_id not in self.slas:
            raise gl.vm.UserError("SLA not found")
        sla = json.loads(self.slas[sla_id])
        if sla["status"] != "awaiting_bond":
            raise gl.vm.UserError("Bond already staked or SLA not open")
        value = gl.message.value
        if value == u256(0):
            raise gl.vm.UserError("Send GEN to stake bond")
        sender = gl.message.sender_address
        if sender.as_hex != sla["agent"]:
            raise gl.vm.UserError("Only the designated agent can stake")
        sla["bond_staked"] = int(value)
        sla["status"] = "active"
        self.slas[sla_id] = json.dumps(sla)
        self.bonds[sender] = self.bonds.get(sender, u256(0)) + value

    @gl.public.write
    def check_epoch(self, sla_id: u256) -> str:
        if sla_id not in self.slas:
            raise gl.vm.UserError("SLA not found")
        sla = json.loads(self.slas[sla_id])
        if sla["status"] != "active":
            raise gl.vm.UserError("SLA not active")

        terms = sla["sla_terms"]
        monitor_url = sla["monitoring_url"]
        service = sla["service_name"]

        def fetch_and_judge() -> str:
            page = gl.nondet.web.render(monitor_url, mode="text")
            prompt = f"""
You are an independent SLA compliance auditor. Read the service status page
below and judge whether the agent met the following SLA terms.

Service: {service}
SLA Terms: {terms}

Status page content:
{page}
End of status page.

Respond ONLY with JSON:
{{
  "compliant": bool,
  "uptime_percent": float,
  "incidents": [str],
  "reasoning": str
}}
No other text. No markdown fences. Only JSON.
"""
            raw = gl.nondet.exec_prompt(prompt)
            return raw.replace("```json", "").replace("```", "").strip()

        result_str = gl.eq_principle.strict_eq(fetch_and_judge)
        result = json.loads(result_str)

        epoch_key = f"{int(sla_id)}:{int(self.epoch_count)}"
        self.epochs[epoch_key] = json.dumps({
            "sla_id": int(sla_id),
            "compliant": result["compliant"],
            "uptime": result.get("uptime_percent", 0.0),
            "incidents": result.get("incidents", []),
            "reasoning": result.get("reasoning", ""),
            "timestamp": int(gl.message.block_timestamp),
        })
        self.epoch_count = self.epoch_count + u256(1)

        if result["compliant"]:
            sla["epochs_passed"] += 1
        else:
            sla["epochs_failed"] += 1

        total = sla["epochs_passed"] + sla["epochs_failed"]
        if total >= sla["duration_days"]:
            rate = sla["epochs_passed"] / total
            if rate >= 0.995:
                sla["status"] = "completed_full"
            elif rate >= 0.95:
                sla["status"] = "completed_partial"
            else:
                sla["status"] = "breached"

        self.slas[sla_id] = json.dumps(sla)
        return result_str

    @gl.public.write
    def dispute_epoch(self, epoch_key: str, counter_evidence: str) -> str:
        if epoch_key not in self.epochs:
            raise gl.vm.UserError("Epoch not found")
        epoch = json.loads(self.epochs[epoch_key])
        if epoch.get("disputed"):
            raise gl.vm.UserError("Already disputed")

        original_reasoning = epoch["reasoning"]
        sla_id = u256(epoch["sla_id"])
        sla = json.loads(self.slas[sla_id])

        def re_judge() -> str:
            prompt = f"""
You are an appeals auditor. An agent disputes an SLA compliance finding.
Consider BOTH the original finding and the agent's counter-evidence.

Original finding: {original_reasoning}
Agent counter-evidence: {counter_evidence}
SLA terms: {sla['sla_terms']}

Was the original finding correct? Respond ONLY with JSON:
{{
  "original_correct": bool,
  "fault_attribution": "agent" | "external" | "unclear",
  "reasoning": str
}}
No other text. Only JSON.
"""
            raw = gl.nondet.exec_prompt(prompt)
            return raw.replace("```json", "").replace("```", "").strip()

        verdict_str = gl.eq_principle.prompt_comparative(
            re_judge,
            "The value of original_correct and fault_attribution must match across validators."
        )
        verdict = json.loads(verdict_str)
        epoch["disputed"] = True
        epoch["dispute_verdict"] = verdict
        self.epochs[epoch_key] = json.dumps(epoch)

        if not verdict["original_correct"] and verdict["fault_attribution"] == "external":
            sla["epochs_failed"] = max(0, sla["epochs_failed"] - 1)
            sla["epochs_passed"] += 1
            self.slas[sla_id] = json.dumps(sla)
            return "OVERTURNED"

        return "UPHELD"

    @gl.public.view
    def get_sla(self, sla_id: u256) -> str:
        return self.slas.get(sla_id, "{}")

    @gl.public.view
    def get_all_slas(self) -> dict[str, str]:
        return {str(k): v for k, v in self.slas.items()}

    @gl.public.view
    def get_epoch(self, epoch_key: str) -> str:
        return self.epochs.get(epoch_key, "{}")

    @gl.public.view
    def get_bond(self, agent_address: str) -> int:
        return int(self.bonds.get(Address(agent_address), u256(0)))

    @gl.public.view
    def get_stats(self) -> dict[str, int]:
        return {
            "total_slas": int(self.sla_count),
            "total_epochs": int(self.epoch_count),
        }
