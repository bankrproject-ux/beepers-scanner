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

let isConnecting = false;
let intentionallyDisconnected = false;


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

  if (disconnectBtn) {
    return;
  }

  if (!connectBtn) {
    return;
  }


  disconnectBtn =
    document.createElement("button");


  disconnectBtn.id =
    "disconnectBtn";


  disconnectBtn.type =
    "button";


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


  disconnectBtn.style.fontWeight =
    "600";


  disconnectBtn.style.letterSpacing =
    "2px";


  disconnectBtn.style.cursor =
    "pointer";


  disconnectBtn.style.whiteSpace =
    "nowrap";


  disconnectBtn.style.position =
    "relative";


  disconnectBtn.style.zIndex =
    "999";


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
    event => {

      event.preventDefault();
      event.stopPropagation();

      disconnectWallet();

    }
  );


  // Insert next to connect button

  connectBtn.insertAdjacentElement(
    "afterend",
    disconnectBtn
  );

}


// ============================================================
// CONNECT BUTTON
// ============================================================

if (connectBtn) {

  connectBtn.addEventListener(
    "click",
    async () => {

      if (isConnecting) {
        return;
      }


      if (userAddress) {
        return;
      }


      await connectWallet();

    }
  );

}


// ============================================================
// CONNECT WALLET
// ============================================================

async function connectWallet() {

  if (isConnecting) {
    return;
  }


  isConnecting = true;

  intentionallyDisconnected = false;


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


    // Request accounts

    const accounts =
      await window.ethereum.request({
        method: "eth_requestAccounts"
      });


    if (!accounts || accounts.length === 0) {

      throw new Error(
        "NO WALLET ACCOUNT FOUND"
      );

    }


    // Switch chain

    await switchToRobinhood();


    // Create provider

    provider =
      new ethers.BrowserProvider(
        window.ethereum
      );


    signer =
      await provider.getSigner();


    userAddress =
      await signer.getAddress();


    contract =
      new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer
      );


    // Update connect button

    if (connectBtn) {

      connectBtn.textContent =
        shortAddress(userAddress);


      connectBtn.classList.add(
        "connected"
      );

    }


    // Show disconnect button

    if (disconnectBtn) {

      disconnectBtn.style.display =
        "inline-block";

    }


    // Update wallet display

    if (walletAddress) {

      walletAddress.textContent =
        shortAddress(userAddress);


      walletAddress.classList.add(
        "active"
      );

    }


    // Pool status

    await updatePoolStatus();


    // Wallet is already connected at this point.
    // NFT loading failure MUST NOT disconnect wallet.

    setScreen(
      "SCANNING...",
      "DETECTING BEEPERS",
      "scanning"
    );


    try {

      await loadUserBeepers();

    } catch (error) {

      console.warn(
        "BEEPER LOAD ERROR:",
        error
      );

      // Keep wallet connected.
      // Collection may not be minted yet.

      userBeepers = [];

      renderBeeperSelector([]);

    }


    // Check result

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


    // IMPORTANT:
    // Only reset if connection itself failed.
    // Don't call disconnectWallet() here.

    provider = null;
    signer = null;
    contract = null;
    userAddress = null;


    if (connectBtn) {

      connectBtn.textContent =
        "CONNECT WALLET";


      connectBtn.classList.remove(
        "connected"
      );

    }


    if (disconnectBtn) {

      disconnectBtn.style.display =
        "none";

    }


    setScreen(
      "CONNECTION FAILED",
      getErrorMessage(error),
      "error"
    );


  } finally {

    isConnecting = false;

  }

}


// ============================================================
// DISCONNECT WALLET
// ============================================================

function disconnectWallet() {

  intentionallyDisconnected = true;


  // Clear app session only

  provider = null;
  signer = null;
  contract = null;

  userAddress = null;

  userBeepers = [];
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


  // Reset wallet display

  if (walletAddress) {

    walletAddress.textContent =
      "NOT CONNECTED";


    walletAddress.classList.remove(
      "active"
    );

  }


  // Reset selector

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


  // Reset screen

  setScreen(
    "READY TO SCAN",
    "CONNECT WALLET TO BEGIN",
    "idle"
  );


  console.log(
    "APP WALLET SESSION DISCONNECTED"
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

    console.warn(
      "BEEPER LOAD ERROR:",
      error
    );


    userBeepers = [];

    renderBeeperSelector([]);

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


  // Auto select if only one NFT

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

if (scanBtn) {

  scanBtn.addEventListener(
    "click",
    scanBeeper
  );

}


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
      tokenIdInput?.value;


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


    const nftOwner =
      await nftContract.ownerOf(
        BigInt(tokenId)
      );


    if (
      nftOwner.toLowerCase() !==
      userAddress.toLowerCase()
    ) {

      throw new Error(
        "BEEPER NOT OWNED"
      );

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

        }

      } catch {

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


    } else {

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


    if (scanBtn) {

      scanBtn.disabled =
        false;


      scanBtn.textContent =
        "SCAN";

    }

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

    console.warn(
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

      if (
        intentionallyDisconnected
      ) {

        return;

      }


      if (
        !accounts ||
        accounts.length === 0
      ) {

        disconnectWallet();

        return;

      }


      // Ignore account event while initial
      // connection is still happening

      if (isConnecting) {
        return;
      }


      // Ignore if app isn't connected

      if (!userAddress) {
        return;
      }


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


        if (connectBtn) {

          connectBtn.textContent =
            shortAddress(userAddress);

        }


        if (walletAddress) {

          walletAddress.textContent =
            shortAddress(userAddress);

        }


        try {

          await loadUserBeepers();

        } catch {

          // Keep wallet connected

        }


        await updatePoolStatus();


      } catch (error) {

        console.error(
          "ACCOUNT CHANGE ERROR:",
          error
        );

      }

    }
  );


  // Chain changed

  window.ethereum.on(
    "chainChanged",
    async chainId => {

      // NEVER reload page

      if (isConnecting) {
        return;
      }


      if (!userAddress) {
        return;
      }


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


        if (connectBtn) {

          connectBtn.textContent =
            shortAddress(userAddress);

        }


        if (walletAddress) {

          walletAddress.textContent =
            shortAddress(userAddress);

        }


        if (disconnectBtn) {

          disconnectBtn.style.display =
            "inline-block";

        }


        await updatePoolStatus();


        try {

          await loadUserBeepers();

        } catch {

          // Keep wallet connected

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
