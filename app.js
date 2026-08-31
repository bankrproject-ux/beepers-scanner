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
// CONNECT WALLET
// ============================================================

connectBtn.addEventListener(
  "click",
  connectWallet
);


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


    // Request wallet connection

    await window.ethereum.request({
      method: "eth_requestAccounts"
    });


    // Switch to Robinhood Chain

    await switchToRobinhood();


    // Create ethers provider

    provider =
      new ethers.BrowserProvider(
        window.ethereum
      );


    signer =
      await provider.getSigner();


    userAddress =
      await signer.getAddress();


    // Create scanner contract

    contract =
      new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer
      );


    // Update wallet UI

    connectBtn.textContent =
      shortAddress(userAddress);

    connectBtn.classList.add(
      "connected"
    );


    walletAddress.textContent =
      shortAddress(userAddress);

    walletAddress.classList.add(
      "active"
    );


    // Check pool

    await updatePoolStatus();


    // Load user's BEEPERS

    setScreen(
      "SCANNING...",
      "DETECTING BEEPERS",
      "scanning"
    );


    await loadUserBeepers();


    if (userBeepers.length === 0) {

      setScreen(
        "NO BEEPERS",
        "NO BEEPERS DETECTED",
        "error"
      );


      signalStatus.textContent =
        "NO SIGNAL";

      signalStatus.className =
        "info-value danger";


      return;
    }


    setScreen(
      "READY",
      "SELECT A BEEPER TO SCAN",
      "success"
    );


    signalStatus.textContent =
      "STANDING BY";

    signalStatus.className =
      "info-value active";


  } catch (error) {

    console.error(error);


    setScreen(
      "CONNECTION FAILED",
      getErrorMessage(error),
      "error"
    );

  }

}


// ============================================================
// LOAD USER BEEPERS
// ============================================================

async function loadUserBeepers() {

  userBeepers = [];

  selectedTokenId = null;


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

    // Check ERC721 Enumerable support
    // 0x780e9d63 = ERC721Enumerable

    const supportsEnumerable =
      await nftContract.supportsInterface(
        "0x780e9d63"
      );


    if (!supportsEnumerable) {

      throw new Error(
        "COLLECTION INDEX UNAVAILABLE"
      );

    }


    // Get NFT balance

    const balance =
      await nftContract.balanceOf(
        userAddress
      );


    const total =
      Number(balance);


    // No NFTs

    if (total === 0) {

      renderBeeperSelector([]);

      return;

    }


    // Get all token IDs owned

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


    // Sort token IDs

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


  // Create select element

  const selector =
    document.createElement("select");


  // Keep same ID

  selector.id =
    "tokenIdInput";


  // Preserve classes

  selector.className =
    tokenIdInput.className;


  // Copy inline style if any

  selector.style.cssText =
    tokenIdInput.style.cssText;


  // Make it visually match existing input

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
    "pointer";


  // Empty option

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


  // Add every BEEPER

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


  // Replace manual input

  tokenIdInput.replaceWith(
    selector
  );


  tokenIdInput =
    selector;


  // If only one BEEPER, auto select it

  if (tokens.length === 1) {

    selector.value =
      tokens[0];


    selectedTokenId =
      tokens[0];

  }


  // Selection event

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


        signalStatus.textContent =
          "STANDING BY";

        signalStatus.className =
          "info-value active";

      }

    }
  );

}


// ============================================================
// SWITCH NETWORK
// ============================================================

async function switchToRobinhood() {

  try {

    await window.ethereum.request({

      method: "wallet_switchEthereumChain",

      params: [
        {
          chainId:
            ROBINHOOD_CHAIN.chainId
        }
      ]

    });

  } catch (error) {

    if (
      error.code === 4902
    ) {

      await window.ethereum.request({

        method: "wallet_addEthereumChain",

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
// SCAN BUTTON
// ============================================================

scanBtn.addEventListener(
  "click",
  scanBeeper
);


async function scanBeeper() {

  try {

    // Wallet check

    if (
      !contract ||
      !signer
    ) {

      setScreen(
        "NO CONNECTION",
        "CONNECT WALLET FIRST",
        "error"
      );

      return;
    }


    // Selected BEEPER check

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


    // Disable button

    scanBtn.disabled =
      true;

    scanBtn.textContent =
      "SCANNING...";


    scannerCard.classList.add(
      "scanning"
    );


    setScreen(
      "SCANNING...",
      "SEARCHING FOR SIGNAL",
      "scanning"
    );


    signalStatus.textContent =
      "SCANNING";


    signalStatus.className =
      "info-value active";


    // Scanner effect

    await sleep(1200);


    // Verify NFT ownership

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


    // Ownership check

    if (
      nftOwner.toLowerCase() !==
      userAddress.toLowerCase()
    ) {

      setScreen(
        "NO SIGNAL",
        "BEEPER NOT DETECTED",
        "error"
      );


      signalStatus.textContent =
        "NO SIGNAL";


      signalStatus.className =
        "info-value danger";


      return;

    }


    // Check if NFT already won

    const eligible =
      await contract.isEligible(
        BigInt(tokenId)
      );


    if (!eligible) {

      await sleep(1000);


      setScreen(
        "NO SIGNAL",
        "SIGNAL LOST",
        "error"
      );


      signalStatus.textContent =
        "NO SIGNAL";


      signalStatus.className =
        "info-value danger";


      return;

    }


    // Send scan transaction

    setScreen(
      "SCANNING...",
      "AWAITING NETWORK RESPONSE",
      "scanning"
    );


    const tx =
      await contract.scan(
        BigInt(tokenId)
      );


    setScreen(
      "SCANNING...",
      "ANALYZING SIGNAL",
      "scanning"
    );


    // Wait confirmation

    const receipt =
      await tx.wait();


    // ========================================================
    // CHECK EVENTS
    // ========================================================

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


    // ========================================================
    // WINNER
    // ========================================================

    if (signalDetected) {

      await sleep(700);


      setScreen(
        "SIGNAL DETECTED",
        "TRANSMISSION RECEIVED",
        "success"
      );


      signalStatus.textContent =
        "DETECTED";


      signalStatus.className =
        "info-value active";


      await updatePoolStatus();


      console.log(
        "WINNER REWARD:",
        reward.toString()
      );


      return;

    }


    // ========================================================
    // NO SIGNAL
    // ========================================================

    await sleep(700);


    setScreen(
      "NO SIGNAL",
      "NOTHING DETECTED",
      "error"
    );


    signalStatus.textContent =
      "NO SIGNAL";


    signalStatus.className =
      "info-value danger";


    await updatePoolStatus();


  } catch (error) {

    console.error(error);


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


    signalStatus.textContent =
      "NO SIGNAL";


    signalStatus.className =
      "info-value danger";


  } finally {

    scannerCard.classList.remove(
      "scanning"
    );


    scanBtn.disabled =
      false;

    scanBtn.textContent =
      "SCAN";

  }

}


// ============================================================
// POOL STATUS
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
      "Pool check failed:",
      error
    );


    poolStatus.textContent =
      "UNKNOWN";

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

  screenStatus.textContent =
    title;

  screenMessage.textContent =
    message;


  scannerCard.classList.remove(
    "scanning"
  );


  if (
    type === "scanning"
  ) {

    scannerCard.classList.add(
      "scanning"
    );

  }


  if (
    type === "success"
  ) {

    screenStatus.style.color =
      "#14200f";

  }


  if (
    type === "error"
  ) {

    screenStatus.style.color =
      "#172011";

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

  if (
    error?.shortMessage
  ) {

    return error.shortMessage
      .toUpperCase();

  }


  if (
    error?.message
  ) {

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
  updatePoolStatus,
  15000
);


// ============================================================
// WALLET ACCOUNT CHANGED
// ============================================================

if (window.ethereum) {

  window.ethereum.on(
    "accountsChanged",
    async accounts => {

      if (
        accounts.length === 0
      ) {

        userAddress =
          null;

        contract =
          null;

        signer =
          null;

        userBeepers =
          [];

        selectedTokenId =
          null;


        connectBtn.textContent =
          "CONNECT WALLET";


        connectBtn.classList.remove(
          "connected"
        );


        walletAddress.textContent =
          "NOT CONNECTED";


        setScreen(
          "READY",
          "CONNECT WALLET TO BEGIN",
          "idle"
        );


      } else {

        // Reconnect with new account

        userAddress =
          accounts[0];


        walletAddress.textContent =
          shortAddress(
            userAddress
          );


        connectBtn.textContent =
          shortAddress(
            userAddress
          );


        if (contract) {

          try {

            await loadUserBeepers();


            if (
              userBeepers.length > 0
            ) {

              setScreen(
                "READY",
                "SELECT A BEEPER TO SCAN",
                "success"
              );

            } else {

              setScreen(
                "NO BEEPERS",
                "NO BEEPERS DETECTED",
                "error"
              );

            }

          } catch (error) {

            console.error(error);

          }

        }

      }

    }
  );


  window.ethereum.on(
    "chainChanged",
    () => {

      window.location.reload();

    }
  );

}
