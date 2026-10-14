"""Direct-mode tests for SafeHarbor."""
import json
import pytest
from genlayer.testing import direct_deploy, direct_vm


@pytest.fixture
def harbor():
    return direct_deploy("contracts/safeharbor.py")


def test_create_sla(harbor):
    direct_vm.sender = "0x" + "ab" * 20
    sla_id = harbor.create_sla(
        "0x" + "cd" * 20,
        "Data Pipeline",
        "99.5% uptime required",
        "https://status.example.com",
        30,
        1000,
    )
    assert sla_id == 0
    sla = json.loads(harbor.get_sla(0))
    assert sla["service_name"] == "Data Pipeline"
    assert sla["status"] == "awaiting_bond"


def test_bond_requires_matching_agent(harbor):
    direct_vm.sender = "0x" + "ab" * 20
    harbor.create_sla(
        "0x" + "cd" * 20,
        "API",
        "99.5% uptime",
        "https://status.example.com",
        30,
        1000,
    )
    direct_vm.sender = "0x" + "ee" * 20
    with pytest.raises(Exception, match="Only the designated agent"):
        harbor.stake_bond(0)


def test_stats_start_zero(harbor):
    stats = harbor.get_stats()
    assert stats["total_slas"] == 0
    assert stats["total_epochs"] == 0
