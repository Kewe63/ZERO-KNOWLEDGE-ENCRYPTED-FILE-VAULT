const connectBtn = document.getElementById('connectWalletBtn');
const walletAddressDisplay = document.getElementById('walletAddress');

export let connectedWallet = null;
export let accountAddress = null;
export let aptosWallet = null;

// --- WALLET STANDARD DISCOVERY (AIP-62) ---

function registerWallet(wallet) {
    if (wallet.features && wallet.features['aptos:connect']) {
        if (wallet.name === 'Petra' || !aptosWallet) {
            aptosWallet = wallet;
        }
    }
}

// The Standard requires passing an API object with a 'register' method
const walletStandardAPI = { register: registerWallet };

// 1. Wallets injected AFTER our script loads
window.addEventListener('wallet-standard:register-wallet', (event) => {
    const callback = event.detail;
    if (typeof callback === 'function') {
        callback(walletStandardAPI);
    }
});

// 2. Discover wallets injected BEFORE our script loads
try {
    window.dispatchEvent(
        new CustomEvent('wallet-standard:app-ready', { detail: walletStandardAPI })
    );
} catch (e) {
    console.warn(e);
}

// Fallback for slower extensions
setTimeout(() => {
    try {
        window.dispatchEvent(
            new CustomEvent('wallet-standard:app-ready', { detail: walletStandardAPI })
        );
    } catch (e) {
        console.warn(e);
    }
}, 500);


// --- CONNECT BUTTON LOGIC ---
if (connectBtn) {
    connectBtn.addEventListener('click', async () => {
        try {
            if (!aptosWallet) {
                alert("> ERROR: No standard Aptos wallet found.\n> Make sure Petra Wallet is installed and unlocked.");
                // Also log to console in case there are other wallets
                console.log("Registered wallets so far:", aptosWallet);
                return;
            }

            connectBtn.textContent = "> CONNECTING...";
            
            const response = await aptosWallet.features['aptos:connect'].connect();
            
            // In the official Wallet Standard (AIP-62), the connected accounts are 
            // appended to the wallet's 'accounts' array after successful connection.
            let extractedAddress = null;
            if (aptosWallet.accounts && aptosWallet.accounts.length > 0) {
                extractedAddress = aptosWallet.accounts[0].address;
            } else if (response) {
                extractedAddress = response.address || (response.account && response.account.address) || (response.args && response.args.address);
            }

            if (extractedAddress && typeof extractedAddress === 'object') {
                if (extractedAddress.toString && typeof extractedAddress.toString === 'function' && extractedAddress.toString() !== '[object Object]') {
                    extractedAddress = extractedAddress.toString();
                } else if (extractedAddress.data || extractedAddress.data === null) {
                    // Extract Uint8Array from standard format
                    const dataObj = extractedAddress.data || extractedAddress;
                    if (dataObj && Object.keys(dataObj).length > 0) {
                        const keys = Object.keys(dataObj).filter(k => !isNaN(k)).sort((a,b) => Number(a)-Number(b));
                        let hex = '0x';
                        for(const k of keys) {
                            hex += Number(dataObj[k]).toString(16).padStart(2, '0');
                        }
                        extractedAddress = hex;
                    }
                }
            } else if (typeof extractedAddress === 'string') {
                // string is fine
            }
            
            accountAddress = extractedAddress;
            
            if (!accountAddress) {
                console.log("Full wallet object:", aptosWallet, "Response:", response);
                
                let debugMsg = "";
                try {
                    debugMsg = "\nResponse: " + JSON.stringify(response) + 
                               "\nAccounts: " + JSON.stringify(aptosWallet.accounts);
                } catch(e) {}

                throw new Error("Wallet did not return an address." + debugMsg);
            }

            const shortAddr = `${accountAddress.slice(0, 6)}...${accountAddress.slice(-4)}`;
            walletAddressDisplay.textContent = `> ${shortAddr}`;
            walletAddressDisplay.style.color = '#00ff41';
            connectBtn.textContent = "> DISCONNECT";
            
            connectedWallet = aptosWallet;

            const disconnectHandler = async () => {
                try {
                    if (aptosWallet.features['aptos:disconnect']) {
                        await aptosWallet.features['aptos:disconnect'].disconnect();
                    }
                } catch (e) {
                    console.warn("Disconnect Error:", e);
                }
                window.location.reload();
            };
            
            const newBtn = connectBtn.cloneNode(true);
            connectBtn.parentNode.replaceChild(newBtn, connectBtn);
            newBtn.addEventListener('click', disconnectHandler);

        } catch (err) {
            console.error("Connection failed:", err);
            // Ignore user cancellation errors
            if (err?.name !== "UserRejectedRequestError") {
                 let msg = err.message || typeof err === 'string' ? err : "Unknown error. Check console.";
                 try { if (!err.message && typeof err === 'object') msg = JSON.stringify(err); } catch(e){}
                 alert("> ERROR: Connection failed.\n" + msg);
            }
            connectBtn.textContent = "> CONNECT_APTOS_WALLET";
        }
    });
}
