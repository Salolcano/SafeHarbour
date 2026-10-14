import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '';
export const EXPLORER = 'https://explorer-studio.genlayer.com';
export const isConfigured = /^0x[0-9a-f]{40}$/i.test(CONTRACT_ADDRESS);

const reader = () => createClient({ chain: studionet });

export async function readContract(functionName, args = []) {
  if (!isConfigured) throw new Error('Set VITE_CONTRACT_ADDRESS in .env');
  return reader().readContract({ address: CONTRACT_ADDRESS, functionName, args });
}

export async function connectWallet() {
  if (!window.ethereum) throw new Error('Install MetaMask');
  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
  const chainId = `0x${studionet.id.toString(16)}`;
  try {
    await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId }] });
  } catch (e) {
    if (Number(e.code) === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId,
          chainName: 'GenLayer Studio',
          nativeCurrency: { name: 'GEN', symbol: 'GEN', decimals: 18 },
          rpcUrls: ['https://studio.genlayer.com/api'],
          blockExplorerUrls: [EXPLORER],
        }],
      });
    }
  }
  const client = createClient({ chain: studionet, account: accounts[0], provider: window.ethereum });
  return { account: accounts[0], client, provider: window.ethereum };
}

export async function writeContract(wallet, functionName, args = [], value = 0n) {
  const hash = await wallet.client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName,
    args,
    value,
  });
  return typeof hash === 'string' ? hash : hash.txId || hash.hash;
}

export async function waitFinalized(hash, onStatus = () => {}) {
  for (let i = 0; i < 120; i += 1) {
    const receipt = await reader().getTransaction({ hash });
    const status = String(receipt?.statusName || receipt?.status || '').toUpperCase();
    onStatus(status);
    if (status === 'FINALIZED' || status === 'ACCEPTED') return receipt;
    if (status === 'FAILED' || status === 'REJECTED') throw new Error('Transaction failed');
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error('Pending - check explorer');
}
