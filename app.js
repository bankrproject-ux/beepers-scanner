// ============================================================
// BEEPERS SCANNER
// ============================================================


// ============================================================
// CONFIG
// ============================================================

const CONTRACT_ADDRESS =
  "0xF068678187EDF82Af5578BB22C4090aA23DE8D16";

const BEEPERS_NFT =
  "0xaa4c702152894addf49e2644147d2b7ea389f8ad";

const NVDA_TOKEN =
  "0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC";


// ============================================================
// ROBINHOOD CHAIN
// ============================================================

const ROBINHOOD_CHAIN = {
  chainId: "0x1237",

  chainName: "Robinhood Chain",

  nativeCurrency: {
    name: "ETH",
    symbol: "ETH",
    decimals: 18
  },

  rpcUrls: [
    "https://rpc.mainnet.chain.robinhood.com"
  ],

  blockExplorerUrls: [
    "https://robinhoodchain.blockscout.com"
  ]
};


// ============================================================
// CONTRACT ABI
// ============================================================

const CONTRACT_ABI = [

  "function scan(uint256 tokenId) external",

  "function getPoolBalance() external view returns (uint256)",

  "function isEligible(uint256 tokenId) external view returns (bool)",

  "function hasWon(uint256 tokenId) external view returns (bool)",

  "event SignalDetected(address indexed winner, uint256 indexed tokenId, uint256 reward)",

  "event NoSignal(address indexed scanner, uint256 indexed tokenId)"

];


// ============================================================
// ERC721 ABI
// ============================================================

const NFT_ABI = [

  "function ownerOf(uint256 tokenId) external view returns (address)",

  "function balanceOf(address owner) external view returns (uint256)",

  "function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256)",

  "function supportsInterface(bytes4 interfaceId) external view returns (bool)"

];


// ============================================================
// STATE
// ============================================================

let provider = null;
let signer = null;
let contract = null;
let userAddress = null;

let userBeepers = [];
let selectedTokenId = null;

let disconnectBtn = null;


// ============================================================
// DOM
// ============================================================

const connectBtn =
  document.getElementById("connectBtn");

const scanBtn =
  document.getElementById("scanBtn");

let tokenIdInput =
  document.getElementById("tokenIdInput");

const screenStatus =
  document.getElementById("screenStatus");

const screenMessage =
  document.getElementById("screenMessage");

const walletAddress =
  document.getElementById("walletAddress");

const poolStatus =
  document.getElementById("poolStatus");

const signalStatus =
  document.getElementById("signalStatus");

const scannerCard =
  document.querySelector(".scanner-card");


// ============================================================
// CREATE DISCONNECT BUTTON
// ============================================================

function createDisconnectButton() {

  // Don't create twice

  if (disconnectBtn) {
    return;
  }


  disconnectBtn =
    document.createElement("button");


  disconnectBtn.id =
    "disconnectBtn";


  disconnectBtn.textContent =
    "DISCONNECT";


  disconnectBtn.style.display =
    "none";


  disconnectBtn.style.marginLeft =
    "10px";


  disconnectBtn.style.padding =
    "12px 16px";


  disconnectBtn.style.background =
    "transparent";


  disconnectBtn.style.border =
    "1px solid #7d9368";


  disconnectBtn.style.color =
    "#9bad83";


  disconnectBtn.style.fontFamily =
    "inherit";


  disconnectBtn.style.fontSize =
    "11px";


  disconnectBtn.style.letterSpacing =
    "2px";


  disconnectBtn.style.cursor =
    "pointer";


  disconnectBtn.style.transition =
    "all 0.2s ease";


  disconnectBtn.addEventListener(
    "mouseenter",
    () => {

      disconnectBtn.style.background =
        "#2a3325";

    }
  );


  disconnectBtn.addEventListener(
    "mouseleave",
    () => {

      disconnectBtn.style.background =
        "transparent";

    }
  );


  disconnectBtn.addEventListener(
    "click",
    disconnectWallet
  );


  // Put button after connect button

  if (connectBtn) {

    connectBtn.insertAdjacentElement(
      "afterend",
      disconnectBtn
    );

  }

}


// ============================================================
// CONNECT BUTTON
// ============================================================

connectBtn.addEventListener(
  "click",
  async () => {

    // If already connected,
    // don't reconnect

    if (userAddress) {
      return;
    }


    await connectWallet();

  }
);


// ============================================================
// CONNECT WALLET
// ============================================================

async function connectWallet() {

  try {

    if (!window.ethereum) {

      setScreen(
        "NO WALLET",
        "INSTALL AN EVM COMPATIBLE WALLET",
        "error"
      );

      return;

    }


    setScreen(
      "CONNECTING...",
      "REQUESTING WALLET ACCESS",
      "scanning"
    );


    // Request wallet

    await window.ethereum.request({
      method: "eth_requestAccounts"
    });


    // Switch network

    await switchToRobinhood();


    // Create provider

    provider =
      new ethers.BrowserProvider(
        window.ethereum
      );


    // Get signer

    signer =
      await provider.getSigner();


    // Get address

    userAddress =
      await signer.getAddress();


    // Create contract

    contract =
      new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer
      );


    // Update connect button

    connectBtn.textContent =
      shortAddress(userAddress);


    connectBtn.classList.add(
      "connected"
    );


    // Show disconnect button

    if (disconnectBtn) {

      disconnectBtn.style.display =
        "inline-block";

    }


    // Update wallet info

    if (walletAddress) {

      walletAddress.textContent =
        shortAddress(userAddress);


      walletAddress.classList.add(
        "active"
      );

    }


    // Update pool

    await updatePoolStatus();


    // Start BEEPER detection

    setScreen(
      "SCANNING...",
      "DETECTING BEEPERS",
      "scanning"
    );


    // Load NFTs

    await loadUserBeepers();


    // No NFTs

    if (userBeepers.length === 0) {

      setScreen(
        "NO BEEPERS",
        "NO BEEPERS DETECTED",
        "error"
      );


      if (signalStatus) {

        signalStatus.textContent =
          "NO SIGNAL";


        signalStatus.className =
          "info-value danger";

      }


      return;

    }


    // Success

    setScreen(
      "READY",
      "SELECT A BEEPER TO SCAN",
      "success"
    );


    if (signalStatus) {

      signalStatus.textContent =
        "STANDING BY";


      signalStatus.className =
        "info-value active";

    }


  } catch (error) {

    console.error(
      "CONNECT ERROR:",
      error
    );


    disconnectWallet();


    setScreen(
      "CONNECTION FAILED",
      getErrorMessage(error),
      "error"
    );

  }

}


// ============================================================
// DISCONNECT WALLET
// ============================================================

function disconnectWallet() {

  console.log(
    "DISCONNECTING WALLET"
  );


  // Clear provider

  provider = null;


  // Clear signer

  signer = null;


  // Clear contract

  contract = null;


  // Clear address

  userAddress = null;


  // Clear NFTs

  userBeepers = [];


  // Clear selected token

  selectedTokenId = null;


  // Reset connect button

  if (connectBtn) {

    connectBtn.textContent =
      "CONNECT WALLET";


    connectBtn.classList.remove(
      "connected"
    );

  }


  // Hide disconnect button

  if (disconnectBtn) {

    disconnectBtn.style.display =
      "none";

  }


  // Reset wallet info

  if (walletAddress) {

    walletAddress.textContent =
      "NOT CONNECTED";


    walletAddress.classList.remove(
      "active"
    );

  }


  // Reset NFT selector

  renderBeeperSelector([]);


  // Reset pool

  if (poolStatus) {

    poolStatus.textContent =
      "UNKNOWN";


    poolStatus.className =
      "info-value";

  }


  // Reset signal

  if (signalStatus) {

    signalStatus.textContent =
      "--";


    signalStatus.className =
      "info-value";

  }


  // Reset scanner

  setScreen(
    "READY TO SCAN",
    "CONNECT WALLET TO BEGIN",
    "idle"
  );


  console.log(
    "WALLET DISCONNECTED"
  );

}


// ============================================================
// LOAD USER BEEPERS
// ============================================================

async function loadUserBeepers() {

  userBeepers = [];

  selectedTokenId = null;


  if (!userAddress) {

    renderBeeperSelector([]);

    return;

  }


  const readProvider =
    new ethers.JsonRpcProvider(
      ROBINHOOD_CHAIN.rpcUrls[0]
    );


  const nftContract =
    new ethers.Contract(
      BEEPERS_NFT,
      NFT_ABI,
      readProvider
    );


  try {

    const supportsEnumerable =
      await nftContract.supportsInterface(
        "0x780e9d63"
      );


    if (!supportsEnumerable) {

      throw new Error(
        "COLLECTION INDEX UNAVAILABLE"
      );

    }


    const balance =
      await nftContract.balanceOf(
        userAddress
      );


    const total =
      Number(balance);


    if (total === 0) {

      renderBeeperSelector([]);

      return;

    }


    for (
      let i = 0;
      i < total;
      i++
    ) {

      const tokenId =
        await nftContract.tokenOfOwnerByIndex(
          userAddress,
          i
        );


      userBeepers.push(
        tokenId.toString()
      );

    }


    userBeepers.sort(
      (a, b) =>
        Number(a) - Number(b)
    );


    renderBeeperSelector(
      userBeepers
    );


  } catch (error) {

    console.error(
      "BEEPER LOAD ERROR:",
      error
    );


    renderBeeperSelector([]);

    throw error;

  }

}


// ============================================================
// RENDER BEEPER SELECTOR
// ============================================================

function renderBeeperSelector(tokens) {

  if (!tokenIdInput) {
    return;
  }


  const selector =
    document.createElement("select");


  selector.id =
    "tokenIdInput";


  selector.className =
    tokenIdInput.className;


  selector.style.cssText =
    tokenIdInput.style.cssText;


  selector.style.width =
    "100%";


  selector.style.height =
    "100%";


  selector.style.background =
    "transparent";


  selector.style.color =
    "inherit";


  selector.style.border =
    "none";


  selector.style.outline =
    "none";


  selector.style.font =
    "inherit";


  selector.style.letterSpacing =
    "inherit";


  selector.style.textTransform =
    "uppercase";


  selector.style.cursor =
    tokens.length > 0
      ? "pointer"
      : "default";


  selector.disabled =
    tokens.length === 0;


  const placeholder =
    document.createElement("option");


  placeholder.value =
    "";


  placeholder.textContent =
    tokens.length
      ? "SELECT BEEPER"
      : "NO BEEPERS FOUND";


  placeholder.disabled =
    true;


  placeholder.selected =
    true;


  selector.appendChild(
    placeholder
  );


  for (
    const tokenId of tokens
  ) {

    const option =
      document.createElement("option");


    option.value =
      tokenId;


    option.textContent =
      `BEEPER #${tokenId}`;


    selector.appendChild(
      option
    );

  }


  tokenIdInput.replaceWith(
    selector
  );


  tokenIdInput =
    selector;


  // Auto select if only one

  if (tokens.length === 1) {

    selector.value =
      tokens[0];


    selectedTokenId =
      tokens[0];


    setScreen(
      "READY",
      `BEEPER #${tokens[0]} LOCKED`,
      "success"
    );

  }


  selector.addEventListener(
    "change",
    () => {

      selectedTokenId =
        selector.value || null;


      if (selectedTokenId) {

        setScreen(
          "READY",
          `BEEPER #${selectedTokenId} LOCKED`,
          "success"
        );


        if (signalStatus) {

          signalStatus.textContent =
            "STANDING BY";


          signalStatus.className =
            "info-value active";

        }

      }

    }
  );

}


// ============================================================
// SWITCH TO ROBINHOOD
// ============================================================

async function switchToRobinhood() {

  try {

    await window.ethereum.request({

      method:
        "wallet_switchEthereumChain",

      params: [
        {
          chainId:
            ROBINHOOD_CHAIN.chainId
        }
      ]

    });

  } catch (error) {

    // Chain not added

    if (error.code === 4902) {

      await window.ethereum.request({

        method:
          "wallet_addEthereumChain",

        params: [
          ROBINHOOD_CHAIN
        ]

      });

    } else {

      throw error;

    }

  }

}


// ============================================================
// SCAN
// ============================================================

scanBtn.addEventListener(
  "click",
  scanBeeper
);


async function scanBeeper() {

  try {

    if (
      !contract ||
      !signer ||
      !userAddress
    ) {

      setScreen(
        "NO CONNECTION",
        "CONNECT WALLET FIRST",
        "error"
      );

      return;

    }


    const tokenId =
      selectedTokenId ||
      tokenIdInput.value;


    if (!tokenId) {

      setScreen(
        "NO BEEPER SELECTED",
        "SELECT A BEEPER FIRST",
        "error"
      );

      return;

    }


    scanBtn.disabled =
      true;


    scanBtn.textContent =
      "SCANNING...";


    if (scannerCard) {

      scannerCard.classList.add(
        "scanning"
      );

    }


    setScreen(
      "SCANNING...",
      "SEARCHING FOR SIGNAL",
      "scanning"
    );


    if (signalStatus) {

      signalStatus.textContent =
        "SCANNING";


      signalStatus.className =
        "info-value active";

    }


    await sleep(1000);


    const readProvider =
      new ethers.JsonRpcProvider(
        ROBINHOOD_CHAIN.rpcUrls[0]
      );


    const nftContract =
      new ethers.Contract(
        BEEPERS_NFT,
        NFT_ABI,
        readProvider
      );


    let nftOwner;


    try {

      nftOwner =
        await nftContract.ownerOf(
          BigInt(tokenId)
        );

    } catch (error) {

      throw new Error(
        "BEEPER NOT FOUND"
      );

    }


    if (
      nftOwner.toLowerCase() !==
      userAddress.toLowerCase()
    ) {

      setScreen(
        "NO SIGNAL",
        "BEEPER NOT DETECTED",
        "error"
      );


      if (signalStatus) {

        signalStatus.textContent =
          "NO SIGNAL";


        signalStatus.className =
          "info-value danger";

      }


      return;

    }


    const eligible =
      await contract.isEligible(
        BigInt(tokenId)
      );


    if (!eligible) {

      setScreen(
        "NO SIGNAL",
        "SIGNAL LOST",
        "error"
      );


      if (signalStatus) {

        signalStatus.textContent =
          "NO SIGNAL";


        signalStatus.className =
          "info-value danger";

      }


      return;

    }


    const tx =
      await contract.scan(
        BigInt(tokenId)
      );


    setScreen(
      "SCANNING...",
      "ANALYZING SIGNAL",
      "scanning"
    );


    const receipt =
      await tx.wait();


    let signalDetected =
      false;


    let reward =
      0n;


    for (
      const log of receipt.logs
    ) {

      try {

        const parsed =
          contract.interface.parseLog(
            log
          );


        if (
          parsed &&
          parsed.name ===
            "SignalDetected"
        ) {

          signalDetected =
            true;


          reward =
            parsed.args.reward;

        }

      } catch (error) {

        // Ignore unrelated logs

      }

    }


    if (signalDetected) {

      setScreen(
        "SIGNAL DETECTED",
        "TRANSMISSION RECEIVED",
        "success"
      );


      if (signalStatus) {

        signalStatus.textContent =
          "DETECTED";


        signalStatus.className =
          "info-value active";

      }


      await updatePoolStatus();


      console.log(
        "REWARD:",
        reward.toString()
      );


      return;

    }


    setScreen(
      "NO SIGNAL",
      "NOTHING DETECTED",
      "error"
    );


    if (signalStatus) {

      signalStatus.textContent =
        "NO SIGNAL";


      signalStatus.className =
        "info-value danger";

    }


    await updatePoolStatus();


  } catch (error) {

    console.error(
      "SCAN ERROR:",
      error
    );


    if (
      error.code === 4001 ||
      error.code === "ACTION_REJECTED"
    ) {

      setScreen(
        "SCAN CANCELLED",
        "SIGNAL INTERRUPTED",
        "error"
      );

    } else {

      setScreen(
        "NO SIGNAL",
        "TRANSMISSION LOST",
        "error"
      );

    }


    if (signalStatus) {

      signalStatus.textContent =
        "NO SIGNAL";


      signalStatus.className =
        "info-value danger";

    }


  } finally {

    if (scannerCard) {

      scannerCard.classList.remove(
        "scanning"
      );

    }


    scanBtn.disabled =
      false;


    scanBtn.textContent =
      "SCAN";

  }

}


// ============================================================
// UPDATE POOL STATUS
// ============================================================

async function updatePoolStatus() {

  try {

    const readProvider =
      new ethers.JsonRpcProvider(
        ROBINHOOD_CHAIN.rpcUrls[0]
      );


    const readContract =
      new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        readProvider
      );


    const balance =
      await readContract.getPoolBalance();


    if (!poolStatus) {
      return;
    }


    if (balance > 0n) {

      poolStatus.textContent =
        "ACTIVE";


      poolStatus.className =
        "info-value active";

    } else {

      poolStatus.textContent =
        "SCANNING";


      poolStatus.className =
        "info-value";

    }

  } catch (error) {

    console.error(
      "POOL ERROR:",
      error
    );


    if (poolStatus) {

      poolStatus.textContent =
        "UNKNOWN";


      poolStatus.className =
        "info-value";

    }

  }

}


// ============================================================
// SCREEN
// ============================================================

function setScreen(
  title,
  message,
  type
) {

  if (screenStatus) {

    screenStatus.textContent =
      title;

  }


  if (screenMessage) {

    screenMessage.textContent =
      message;

  }


  if (scannerCard) {

    scannerCard.classList.remove(
      "scanning"
    );


    if (type === "scanning") {

      scannerCard.classList.add(
        "scanning"
      );

    }

  }

}


// ============================================================
// HELPERS
// ============================================================

function shortAddress(address) {

  return (
    address.slice(0, 6) +
    "..." +
    address.slice(-4)
  );

}


function sleep(ms) {

  return new Promise(
    resolve =>
      setTimeout(resolve, ms)
  );

}


function getErrorMessage(error) {

  if (error?.shortMessage) {

    return error.shortMessage
      .slice(0, 70)
      .toUpperCase();

  }


  if (error?.message) {

    return error.message
      .slice(0, 70)
      .toUpperCase();

  }


  return "UNKNOWN ERROR";

}


// ============================================================
// AUTO UPDATE POOL
// ============================================================

setInterval(
  () => {

    if (userAddress) {

      updatePoolStatus();

    }

  },
  15000
);


// ============================================================
// WALLET EVENTS
// ============================================================

if (window.ethereum) {

  // Account changed

  window.ethereum.on(
    "accountsChanged",
    async accounts => {

      // Wallet disconnected from extension

      if (accounts.length === 0) {

        disconnectWallet();

        return;

      }


      // Website intentionally disconnected
      // Don't reconnect automatically

      if (!userAddress) {
        return;
      }


      // Account changed

      try {

        userAddress =
          accounts[0];


        provider =
          new ethers.BrowserProvider(
            window.ethereum
          );


        signer =
          await provider.getSigner();


        contract =
          new ethers.Contract(
            CONTRACT_ADDRESS,
            CONTRACT_ABI,
            signer
          );


        connectBtn.textContent =
          shortAddress(userAddress);


        if (walletAddress) {

          walletAddress.textContent =
            shortAddress(userAddress);

        }


        await loadUserBeepers();


        await updatePoolStatus();


      } catch (error) {

        console.error(
          "ACCOUNT CHANGE ERROR:",
          error
        );

      }

    }
  );


  // Network changed
  // IMPORTANT: DO NOT RELOAD PAGE

  window.ethereum.on(
    "chainChanged",
    async chainId => {

      console.log(
        "NETWORK CHANGED:",
        chainId
      );


      // Don't do anything if app disconnected

      if (!userAddress) {
        return;
      }


      // If user leaves Robinhood

      if (
        chainId.toLowerCase() !==
        ROBINHOOD_CHAIN.chainId.toLowerCase()
      ) {

        setScreen(
          "WRONG NETWORK",
          "SWITCH TO ROBINHOOD NETWORK",
          "error"
        );


        return;

      }


      // Recreate provider after chain switch
      // WITHOUT refreshing page

      try {

        provider =
          new ethers.BrowserProvider(
            window.ethereum
          );


        signer =
          await provider.getSigner();


        contract =
          new ethers.Contract(
            CONTRACT_ADDRESS,
            CONTRACT_ABI,
            signer
          );


        userAddress =
          await signer.getAddress();


        connectBtn.textContent =
          shortAddress(userAddress);


        if (walletAddress) {

          walletAddress.textContent =
            shortAddress(userAddress);

        }


        if (disconnectBtn) {

          disconnectBtn.style.display =
            "inline-block";

        }


        await updatePoolStatus();


        await loadUserBeepers();


        if (
          userBeepers.length > 0
        ) {

          setScreen(
            "READY",
            "SELECT A BEEPER TO SCAN",
            "success"
          );

        }


      } catch (error) {

        console.error(
          "CHAIN CHANGE ERROR:",
          error
        );

      }

    }
  );

}


// ============================================================
// INITIALIZE
// ============================================================

createDisconnectButton();


setScreen(
  "READY TO SCAN",
  "CONNECT WALLET TO BEGIN",
  "idle"
);
