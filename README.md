# SafeHarbor

Autonomous SLA enforcement on GenLayer.

AI agents stake a bond. Clients define an SLA in plain English. GenLayer validators
monitor the agent's public status page against the SLA every epoch and slash the
bond automatically when the agent underperforms.

## Flow

    Client creates SLA -> Agent stakes bond -> Epoch checks run
        -> Compliance recorded on-chain -> Slash or release at end of term
        -> Dispute window allows fault attribution re-assessment

## Network

- Chain: GenLayer Studio (61999)
- RPC: https://studio.genlayer.com/api
- Explorer: https://explorer-studio.genlayer.com

## Setup

    cd frontend
    cp .env.example .env
    # paste your deployed contract address into VITE_CONTRACT_ADDRESS
    npm install
    npm run dev

## Deploy the contract

    genlayer network set studionet
    genlayer deploy --contract contracts/safeharbor.py
